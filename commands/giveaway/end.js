const { SlashCommandBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config.json');
const Database = require('../../utils/database');

// Giveaway database
const giveawayDb = new Database('giveaways.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gend')
    .setDescription('End a giveaway early')
    .addStringOption(option => 
      option.setName('giveaway_id')
        .setDescription('The ID of the giveaway to end')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),
  
  cooldown: 5,
  
  /**
   * Executes the giveaway end command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const giveawayId = interaction.options.getString('giveaway_id');
    
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
    
    // Check if already ended
    if (giveaway.ended) {
      return interaction.reply({
        content: 'This giveaway has already ended.',
        ephemeral: true
      });
    }
    
    // Defer reply
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // End the giveaway
      await endGiveawayEarly(interaction.client, giveawayId);
      
      // Success message
      await interaction.editReply({
        embeds: [{
          title: '✅ Giveaway Ended',
          description: `The giveaway for **${giveaway.prize}** has been ended early.`,
          color: parseInt(config.successColor.replace('#', ''), 16),
          timestamp: new Date().toISOString()
        }]
      });
      
      logger.info(`Giveaway ${giveawayId} ended early by ${interaction.user.tag} (${interaction.user.id})`);
    } catch (error) {
      logger.error(`Error ending giveaway ${giveawayId}: ${error.message}`);
      
      await interaction.editReply({
        embeds: [{
          title: '❌ Failed to End Giveaway',
          description: `An error occurred: ${error.message}`,
          color: parseInt(config.errorColor.replace('#', ''), 16),
          timestamp: new Date().toISOString()
        }]
      });
    }
  },
  
  /**
   * Handles ending a giveaway from a button interaction
   * @param {Interaction} interaction - The button interaction
   * @param {Client} client - The Discord client
   * @param {string} giveawayId - The ID of the giveaway
   */
  async handleEndEarly(interaction, client, giveawayId) {
    // Check if user has permission
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEvents)) {
      return interaction.reply({
        content: 'You do not have permission to end giveaways.',
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
    
    // Check if already ended
    if (giveaway.ended) {
      return interaction.reply({
        content: 'This giveaway has already ended.',
        ephemeral: true
      });
    }
    
    // Defer reply
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // End the giveaway
      await endGiveawayEarly(client, giveawayId);
      
      // Success message
      await interaction.editReply({
        embeds: [{
          title: '✅ Giveaway Ended',
          description: `The giveaway for **${giveaway.prize}** has been ended early.`,
          color: parseInt(config.successColor.replace('#', ''), 16),
          timestamp: new Date().toISOString()
        }]
      });
      
      logger.info(`Giveaway ${giveawayId} ended early by ${interaction.user.tag} (${interaction.user.id}) using button`);
    } catch (error) {
      logger.error(`Error ending giveaway ${giveawayId}: ${error.message}`);
      
      await interaction.editReply({
        embeds: [{
          title: '❌ Failed to End Giveaway',
          description: `An error occurred: ${error.message}`,
          color: parseInt(config.errorColor.replace('#', ''), 16),
          timestamp: new Date().toISOString()
        }]
      });
    }
  }
};

/**
 * Ends a giveaway early and picks winners
 * @param {Client} client - The Discord client
 * @param {string} giveawayId - The ID of the giveaway to end
 */
async function endGiveawayEarly(client, giveawayId) {
  const giveaways = giveawayDb.read();
  const giveawayIndex = giveaways.findIndex(g => g.id === giveawayId);
  
  if (giveawayIndex === -1) {
    throw new Error('Giveaway not found');
  }
  
  const giveaway = giveaways[giveawayIndex];
  
  // Check if already ended
  if (giveaway.ended) {
    throw new Error('Giveaway already ended');
  }
  
  // Mark as ended
  giveaway.ended = true;
  giveaway.endedAt = Date.now();
  
  // Find winners
  const winners = pickWinners(giveaway.participants, giveaway.winnerCount);
  giveaway.winners = winners;
  
  // Save changes
  giveaways[giveawayIndex] = giveaway;
  giveawayDb.write(giveaways);
  
  // Fetch channel and message
  const channel = client.channels.cache.get(giveaway.channelId);
  if (!channel) {
    throw new Error('Channel not found');
  }
  
  const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
  if (!message) {
    throw new Error('Message not found');
  }
  
  // Create reroll button if there are winners
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway:reroll:${giveawayId}`)
      .setLabel('Reroll Winner')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔄')
  );
  
  // Update the giveaway message
  const winnerText = winners.length > 0 
    ? winners.map(id => `<@${id}>`).join(', ')
    : 'No valid participants';
  
  const embed = message.embeds[0];
  const fields = [...embed.fields];
  
  // Update fields
  fields.push({
    name: 'Winners',
    value: winnerText,
    inline: false
  });
  
  const updatedEmbed = {
    ...embed.toJSON(),
    title: `🎊 GIVEAWAY ENDED: ${giveaway.prize}`,
    fields,
    color: winners.length > 0 ? parseInt(config.successColor.replace('#', ''), 16) : parseInt(config.errorColor.replace('#', ''), 16)
  };
  
  await message.edit({ 
    embeds: [updatedEmbed], 
    components: winners.length > 0 ? [row] : [] 
  });
  
  // Send a winner announcement
  if (winners.length > 0) {
    await channel.send({
      content: `Congratulations ${winnerText}! You won **${giveaway.prize}**!\n[Jump to Giveaway](${message.url})`,
      allowedMentions: { users: winners }
    });
    
    logger.info(`Giveaway ${giveawayId} ended early. Winners: ${winners.join(', ')}`);
  } else {
    await channel.send({
      content: `No one won the giveaway for **${giveaway.prize}** because there were no valid participants.`,
    });
    
    logger.info(`Giveaway ${giveawayId} ended early with no winners`);
  }
}

/**
 * Picks random winners from an array of participants
 * @param {string[]} participants - Array of participant IDs
 * @param {number} winnerCount - Number of winners to pick
 * @returns {string[]} - Array of winner IDs
 */
function pickWinners(participants, winnerCount) {
  // If there are no participants, return empty array
  if (participants.length === 0) {
    return [];
  }
  
  // If there are fewer participants than winners, return all participants
  if (participants.length <= winnerCount) {
    return [...participants];
  }
  
  // Randomly select winners
  const winners = [];
  const participantsCopy = [...participants];
  
  for (let i = 0; i < winnerCount; i++) {
    const winnerIndex = Math.floor(Math.random() * participantsCopy.length);
    const winner = participantsCopy[winnerIndex];
    
    winners.push(winner);
    
    // Remove the winner to avoid duplicate winners
    participantsCopy.splice(winnerIndex, 1);
  }
  
  return winners;
}
