const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config.json');
const Database = require('../../utils/database');

// Giveaway database
const giveawayDb = new Database('giveaways.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('greroll')
    .setDescription('Reroll a giveaway to pick new winners')
    .addStringOption(option => 
      option.setName('giveaway_id')
        .setDescription('The ID of the giveaway to reroll')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('winners')
        .setDescription('Number of winners to reroll (defaults to 1)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),
  
  cooldown: 5,
  
  /**
   * Executes the giveaway reroll command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const giveawayId = interaction.options.getString('giveaway_id');
    const winnerCount = interaction.options.getInteger('winners') || 1;
    
    // Get giveaway data
    const giveaways = giveawayDb.read();
    const giveawayIndex = giveaways.findIndex(g => g.id === giveawayId);
    
    if (giveawayIndex === -1) {
      return interaction.reply({
        content: 'Giveaway not found. Please check the ID.',
        ephemeral: true
      });
    }
    
    const giveaway = giveaways[giveawayIndex];
    
    // Check if the giveaway has ended
    if (!giveaway.ended) {
      return interaction.reply({
        content: 'This giveaway has not ended yet.',
        ephemeral: true
      });
    }
    
    // Defer reply
    await interaction.deferReply();
    
    try {
      // Reroll winners
      await rerollGiveaway(interaction.client, giveaway, winnerCount);
      
      // Success message
      await interaction.editReply({
        embeds: [{
          title: '✅ Giveaway Rerolled',
          description: `New winners have been selected for the giveaway **${giveaway.prize}**.`,
          color: parseInt(config.successColor.replace('#', ''), 16),
          timestamp: new Date().toISOString()
        }]
      });
      
      logger.info(`Giveaway ${giveawayId} rerolled by ${interaction.user.tag} (${interaction.user.id})`);
    } catch (error) {
      logger.error(`Error rerolling giveaway ${giveawayId}: ${error.message}`);
      
      await interaction.editReply({
        embeds: [{
          title: '❌ Failed to Reroll Giveaway',
          description: `An error occurred: ${error.message}`,
          color: parseInt(config.errorColor.replace('#', ''), 16),
          timestamp: new Date().toISOString()
        }]
      });
    }
  },
  
  /**
   * Handles rerolling a giveaway from a button interaction
   * @param {Interaction} interaction - The button interaction
   * @param {Client} client - The Discord client
   * @param {string} giveawayId - The ID of the giveaway
   */
  async handleReroll(interaction, client, giveawayId) {
    // Check if user has permission
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEvents)) {
      return interaction.reply({
        content: 'You do not have permission to reroll giveaways.',
        ephemeral: true
      });
    }
    
    // Get giveaway data
    const giveaways = giveawayDb.read();
    const giveawayIndex = giveaways.findIndex(g => g.id === giveawayId);
    
    if (giveawayIndex === -1) {
      return interaction.reply({
        content: 'Giveaway not found.',
        ephemeral: true
      });
    }
    
    const giveaway = giveaways[giveawayIndex];
    
    // Check if the giveaway has ended
    if (!giveaway.ended) {
      return interaction.reply({
        content: 'This giveaway has not ended yet.',
        ephemeral: true
      });
    }
    
    // Defer reply
    await interaction.deferReply();
    
    try {
      // Reroll one winner
      await rerollGiveaway(client, giveaway, 1);
      
      // Success message
      await interaction.editReply({
        embeds: [{
          title: '✅ Giveaway Rerolled',
          description: `New winner has been selected for the giveaway **${giveaway.prize}**.`,
          color: parseInt(config.successColor.replace('#', ''), 16),
          timestamp: new Date().toISOString()
        }]
      });
      
      logger.info(`Giveaway ${giveawayId} rerolled by ${interaction.user.tag} (${interaction.user.id}) using button`);
    } catch (error) {
      logger.error(`Error rerolling giveaway ${giveawayId}: ${error.message}`);
      
      await interaction.editReply({
        embeds: [{
          title: '❌ Failed to Reroll Giveaway',
          description: `An error occurred: ${error.message}`,
          color: parseInt(config.errorColor.replace('#', ''), 16),
          timestamp: new Date().toISOString()
        }]
      });
    }
  }
};

/**
 * Rerolls a giveaway to pick new winners
 * @param {Client} client - The Discord client
 * @param {Object} giveaway - The giveaway data
 * @param {number} winnerCount - The number of winners to reroll
 */
async function rerollGiveaway(client, giveaway, winnerCount) {
  // Check if there are enough participants
  if (giveaway.participants.length === 0) {
    throw new Error('There are no participants to reroll.');
  }
  
  // Get channel and message
  const channel = client.channels.cache.get(giveaway.channelId);
  if (!channel) {
    throw new Error('Channel not found.');
  }
  
  // Pick new winners, excluding previous winners if possible
  let eligibleParticipants = [...giveaway.participants];
  
  // Filter out previous winners if there are enough participants
  if (giveaway.winners && giveaway.winners.length > 0 && eligibleParticipants.length > giveaway.winners.length) {
    eligibleParticipants = eligibleParticipants.filter(p => !giveaway.winners.includes(p));
  }
  
  // If no eligible participants remain, use all participants
  if (eligibleParticipants.length === 0) {
    eligibleParticipants = [...giveaway.participants];
  }
  
  // Pick new winners, accounting for bonus entries
  let newWinners = [];
  
  // If there are fewer eligible participants than requested winners, use all eligible
  if (eligibleParticipants.length <= winnerCount) {
    newWinners = [...eligibleParticipants];
  } else {
    // Create weighted entry pool for bonus entries
    const entryPool = [];
    
    eligibleParticipants.forEach(userId => {
      // Get number of entries for this user (default to 1)
      const entryCount = giveaway.participantEntries?.[userId] || 1;
      
      // Add user to the pool multiple times based on entry count
      for (let i = 0; i < entryCount; i++) {
        entryPool.push(userId);
      }
    });
    
    // Randomly select winners from weighted pool
    for (let i = 0; i < winnerCount; i++) {
      if (newWinners.length >= eligibleParticipants.length) break; // Prevent infinite loop
      
      let attempts = 0;
      let winnerFound = false;
      
      // Try to find a winner up to 100 times (avoid infinite loop)
      while (!winnerFound && attempts < 100) {
        const randomIndex = Math.floor(Math.random() * entryPool.length);
        const potentialWinner = entryPool[randomIndex];
        
        // If this user hasn't been selected yet, add them as a winner
        if (!newWinners.includes(potentialWinner)) {
          newWinners.push(potentialWinner);
          winnerFound = true;
        }
        
        attempts++;
      }
    }
  }
  
  // Update giveaway in database
  const giveaways = giveawayDb.read();
  const giveawayIndex = giveaways.findIndex(g => g.id === giveaway.id);
  
  if (giveawayIndex !== -1) {
    giveaways[giveawayIndex].winners = newWinners;
    giveaways[giveawayIndex].rerolled = true;
    giveaways[giveawayIndex].lastReroll = Date.now();
    
    giveawayDb.write(giveaways);
  }
  
  // Format winners mention
  const winnerMentions = newWinners.map(id => `<@${id}>`).join(', ');
  
  // Import the animations utility
  const animations = require('../../utils/animations');
  
  // Send initial announcement with animation (frame 0)
  const animationMsg = await channel.send({
    content: animations.createWinnerAnnouncement(giveaway.prize, winnerMentions, 0) + 
            `\n**REROLLED!** [Jump to Giveaway](https://discord.com/channels/${channel.guild.id}/${channel.id}/${giveaway.messageId})`,
    allowedMentions: { users: newWinners }
  });
  
  // Animate the confetti (8 frames, 600ms delay)
  for (let frame = 1; frame < 8; frame++) {
    try {
      // We use a setTimeout inside an IIFE to capture the current frame value
      ((currentFrame) => {
        setTimeout(async () => {
          try {
            // Update message with new animation frame
            await animationMsg.edit({
              content: animations.createWinnerAnnouncement(giveaway.prize, winnerMentions, currentFrame) + 
                      `\n**REROLLED!** [Jump to Giveaway](https://discord.com/channels/${channel.guild.id}/${channel.id}/${giveaway.messageId})`,
              allowedMentions: { users: newWinners }
            });
          } catch (editError) {
            // Silently fail if we can't edit the message (it might have been deleted)
            logger.debug(`Error updating reroll animation frame ${currentFrame}: ${editError.message}`);
          }
        }, currentFrame * 600); // 600ms between frames
      })(frame);
    } catch (animError) {
      logger.debug(`Reroll animation error: ${animError.message}`);
    }
  }
  
  // Try to update the giveaway message
  try {
    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (message) {
      const embed = message.embeds[0];
      const fields = [...embed.fields];
      
      // Update winner field
      const winnerIndex = fields.findIndex(field => field.name === 'Winners' && !field.inline);
      if (winnerIndex !== -1) {
        fields[winnerIndex] = {
          name: 'Winners (Rerolled)',
          value: winnerMentions,
          inline: false
        };
        
        const updatedEmbed = {
          ...embed.toJSON(),
          fields
        };
        
        await message.edit({ embeds: [updatedEmbed] });
      }
    }
  } catch (error) {
    logger.warn(`Could not update giveaway message: ${error.message}`);
  }
  
  logger.info(`Giveaway ${giveaway.id} rerolled. New winners: ${newWinners.join(', ')}`);
}
