const { SlashCommandBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config.json');
const fs = require('fs');
const path = require('path');
const Database = require('../../utils/database');

// Giveaway database
const giveawayDb = new Database('giveaways.json');

// Duration units in milliseconds
const durationUnits = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Create a new giveaway')
    .addStringOption(option => 
      option.setName('prize')
        .setDescription('What are you giving away?')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('duration')
        .setDescription('Duration of the giveaway (e.g., 1d, 12h, 30m)')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('winners')
        .setDescription('Number of winners')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10))
    .addRoleOption(option => 
      option.setName('required_role')
        .setDescription('Role required to enter the giveaway')
        .setRequired(false))
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('Channel to host the giveaway in')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('description')
        .setDescription('Additional description for the giveaway')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),
  
  cooldown: 10,
  
  /**
   * Executes the giveaway create command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const prize = interaction.options.getString('prize');
    const durationStr = interaction.options.getString('duration');
    const winnerCount = interaction.options.getInteger('winners');
    const requiredRole = interaction.options.getRole('required_role');
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const description = interaction.options.getString('description') || '';
    
    // Parse duration
    const duration = parseDuration(durationStr);
    if (duration === 0) {
      return interaction.reply({
        content: 'Invalid duration format. Please use a format like 1d, 12h, 30m, or 60s.',
        ephemeral: true
      });
    }
    
    // Check if channel is a text channel
    if (channel.type !== 0) {
      return interaction.reply({
        content: 'Giveaways can only be hosted in text channels.',
        ephemeral: true
      });
    }
    
    // Check if bot has permissions in the channel
    const botPermissions = channel.permissionsFor(interaction.client.user);
    if (!botPermissions.has('SendMessages') || !botPermissions.has('EmbedLinks')) {
      return interaction.reply({
        content: `I don't have permission to send messages or embeds in ${channel}.`,
        ephemeral: true
      });
    }
    
    // Defer reply
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Calculate end time
      const endTime = Date.now() + duration;
      
      // Generate a unique ID for the giveaway
      const giveawayId = Date.now().toString();
      
      // Create buttons
      const joinButton = new ButtonBuilder()
        .setCustomId(`giveaway:join:${giveawayId}`)
        .setLabel('Enter Giveaway')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎉');
      
      const row = new ActionRowBuilder().addComponents(joinButton);
      
      // Create giveaway embed
      const giveawayEmbed = {
        title: `🎉 GIVEAWAY: ${prize}`,
        description: description ? `${description}\n\n` : '',
        fields: [
          { name: 'Ends At', value: `<t:${Math.floor(endTime / 1000)}:R> (<t:${Math.floor(endTime / 1000)}:F>)`, inline: true },
          { name: 'Hosted By', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Winners', value: winnerCount.toString(), inline: true },
          { name: 'Entries', value: '0', inline: true },
          ...(requiredRole ? [{ name: 'Required Role', value: `<@&${requiredRole.id}>`, inline: true }] : []),
          { name: 'How to Enter', value: 'Click the "Enter Giveaway" button below to enter!', inline: false }
        ],
        color: parseInt(config.embedColor.replace('#', ''), 16),
        footer: {
          text: `Giveaway ID: ${giveawayId}`,
        },
        timestamp: new Date().toISOString()
      };
      
      // Send giveaway message
      const giveawayMessage = await channel.send({
        embeds: [giveawayEmbed],
        components: [row]
      });
      
      // Store giveaway data
      const giveawayData = {
        id: giveawayId,
        prize,
        description,
        endTime,
        channelId: channel.id,
        messageId: giveawayMessage.id,
        hostId: interaction.user.id,
        winnerCount,
        requiredRoleId: requiredRole ? requiredRole.id : null,
        participants: [],
        ended: false
      };
      
      // Save to giveaways
      const giveaways = giveawayDb.read();
      giveaways.push(giveawayData);
      giveawayDb.write(giveaways);
      
      // Schedule the giveaway to end
      setTimeout(() => {
        endGiveaway(interaction.client, giveawayId);
      }, duration);
      
      // Success message
      await interaction.editReply({
        embeds: [{
          title: '✅ Giveaway Created',
          description: `Giveaway for **${prize}** has been created in ${channel}.`,
          fields: [
            { name: 'Duration', value: formatDuration(duration), inline: true },
            { name: 'Winners', value: winnerCount.toString(), inline: true },
            ...(requiredRole ? [{ name: 'Required Role', value: requiredRole.name, inline: true }] : [])
          ],
          color: parseInt(config.successColor.replace('#', ''), 16),
          timestamp: new Date().toISOString()
        }]
      });
      
      logger.info(`Giveaway ${giveawayId} created by ${interaction.user.tag} (${interaction.user.id}) in channel ${channel.name} (${channel.id})`);
    } catch (error) {
      logger.error(`Error creating giveaway: ${error.message}`);
      
      await interaction.editReply({
        embeds: [{
          title: '❌ Giveaway Creation Failed',
          description: `Failed to create giveaway: ${error.message}`,
          color: parseInt(config.errorColor.replace('#', ''), 16),
          timestamp: new Date().toISOString()
        }]
      });
    }
  },
  
  /**
   * Loads active giveaways when the bot starts
   * @param {Client} client - The Discord client
   */
  loadGiveaways(client) {
    const giveaways = giveawayDb.read();
    
    // Schedule ending for active giveaways
    giveaways.forEach(giveaway => {
      if (!giveaway.ended) {
        const timeLeft = giveaway.endTime - Date.now();
        
        if (timeLeft <= 0) {
          // End giveaway immediately if it's already past the end time
          endGiveaway(client, giveaway.id);
        } else {
          // Schedule ending for future giveaways
          setTimeout(() => {
            endGiveaway(client, giveaway.id);
          }, timeLeft);
        }
      }
    });
    
    logger.info(`Loaded ${giveaways.filter(g => !g.ended).length} active giveaways`);
  },
  
  /**
   * Periodically checks giveaways to make sure none are missed
   * @param {Client} client - The Discord client
   */
  checkGiveaways(client) {
    const giveaways = giveawayDb.read();
    const now = Date.now();
    
    giveaways.forEach(giveaway => {
      if (!giveaway.ended && giveaway.endTime <= now) {
        endGiveaway(client, giveaway.id);
      }
    });
  },
  
  /**
   * Handles when a user clicks the Join Giveaway button
   * @param {Interaction} interaction - The button interaction
   * @param {Client} client - The Discord client
   * @param {string} giveawayId - The ID of the giveaway
   */
  async handleGiveawayJoin(interaction, client, giveawayId) {
    const giveaways = giveawayDb.read();
    const giveawayIndex = giveaways.findIndex(g => g.id === giveawayId);
    
    if (giveawayIndex === -1) {
      return interaction.reply({
        content: 'This giveaway no longer exists.',
        ephemeral: true
      });
    }
    
    const giveaway = giveaways[giveawayIndex];
    
    // Check if giveaway has ended
    if (giveaway.ended) {
      return interaction.reply({
        content: 'This giveaway has already ended.',
        ephemeral: true
      });
    }
    
    // Check if user has required role
    if (giveaway.requiredRoleId) {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (!member.roles.cache.has(giveaway.requiredRoleId)) {
        const roleName = interaction.guild.roles.cache.get(giveaway.requiredRoleId)?.name || 'Required Role';
        return interaction.reply({
          content: `You need the ${roleName} role to enter this giveaway.`,
          ephemeral: true
        });
      }
    }
    
    // Check if user already entered
    if (giveaway.participants.includes(interaction.user.id)) {
      return interaction.reply({
        content: 'You have already entered this giveaway.',
        ephemeral: true
      });
    }
    
    // Add user to participants
    giveaway.participants.push(interaction.user.id);
    giveaways[giveawayIndex] = giveaway;
    giveawayDb.write(giveaways);
    
    // Update the giveaway message
    try {
      const channel = client.channels.cache.get(giveaway.channelId);
      if (channel) {
        const message = await channel.messages.fetch(giveaway.messageId);
        
        const embed = message.embeds[0];
        const fields = [...embed.fields];
        
        // Update entries count
        const entriesIndex = fields.findIndex(field => field.name === 'Entries');
        if (entriesIndex !== -1) {
          fields[entriesIndex] = {
            name: 'Entries',
            value: giveaway.participants.length.toString(),
            inline: true
          };
        }
        
        const updatedEmbed = {
          ...embed.toJSON(),
          fields
        };
        
        await message.edit({ embeds: [updatedEmbed] });
      }
    } catch (error) {
      logger.error(`Error updating giveaway message: ${error.message}`);
    }
    
    // Success message to user
    return interaction.reply({
      content: `You have entered the giveaway for **${giveaway.prize}**! Good luck!`,
      ephemeral: true
    });
  }
};

/**
 * Parses a duration string into milliseconds
 * @param {string} durationStr - Duration string (e.g., 1d, 12h, 30m)
 * @returns {number} - Duration in milliseconds
 */
function parseDuration(durationStr) {
  const regex = /^(\d+)([smhd])$/;
  const match = durationStr.match(regex);
  
  if (!match) return 0;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  return value * durationUnits[unit];
}

/**
 * Formats a duration in milliseconds to a human-readable string
 * @param {number} duration - Duration in milliseconds
 * @returns {string} - Formatted duration
 */
function formatDuration(duration) {
  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day(s)`;
  } else if (hours > 0) {
    return `${hours} hour(s)`;
  } else if (minutes > 0) {
    return `${minutes} minute(s)`;
  } else {
    return `${seconds} second(s)`;
  }
}

/**
 * Ends a giveaway and picks winners
 * @param {Client} client - The Discord client
 * @param {string} giveawayId - The ID of the giveaway to end
 */
async function endGiveaway(client, giveawayId) {
  const giveaways = giveawayDb.read();
  const giveawayIndex = giveaways.findIndex(g => g.id === giveawayId);
  
  if (giveawayIndex === -1) {
    logger.warn(`Giveaway ${giveawayId} not found when trying to end it`);
    return;
  }
  
  const giveaway = giveaways[giveawayIndex];
  
  // Check if already ended
  if (giveaway.ended) {
    return;
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
  
  try {
    const channel = client.channels.cache.get(giveaway.channelId);
    if (!channel) {
      logger.warn(`Channel ${giveaway.channelId} not found for giveaway ${giveawayId}`);
      return;
    }
    
    // Fetch the giveaway message
    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (!message) {
      logger.warn(`Message ${giveaway.messageId} not found for giveaway ${giveawayId}`);
      return;
    }
    
    // Create end buttons if there are winners
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
      
      logger.info(`Giveaway ${giveawayId} ended. Winners: ${winners.join(', ')}`);
    } else {
      await channel.send({
        content: `No one won the giveaway for **${giveaway.prize}** because there were no valid participants.`,
      });
      
      logger.info(`Giveaway ${giveawayId} ended with no winners`);
    }
  } catch (error) {
    logger.error(`Error ending giveaway ${giveawayId}: ${error.message}`);
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
