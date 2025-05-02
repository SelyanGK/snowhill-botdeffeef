const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config.json');
const { getDatabase } = require('../../utils/dbManager');

// Sticky message database - using static instance from dbManager
const stickyDb = getDatabase('sticky');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sticky')
    .setDescription('Set a sticky message in the current channel')
    .addStringOption(option => 
      option.setName('message')
        .setDescription('The content of the sticky message')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('embed')
        .setDescription('Optional embed content (leave blank to not use an embed)')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('color')
        .setDescription('Embed color (hex code)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  cooldown: 5,
  
  /**
   * Executes the sticky message set command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const messageContent = interaction.options.getString('message');
    const embedContent = interaction.options.getString('embed');
    const color = interaction.options.getString('color') || config.embedColor;
    
    // Validate color if provided
    let colorInt;
    try {
      if (color) {
        const colorCode = color.startsWith('#') ? color : `#${color}`;
        colorInt = parseInt(colorCode.replace('#', ''), 16);
        if (isNaN(colorInt)) throw new Error('Invalid color format');
      }
    } catch (error) {
      return interaction.reply({
        content: 'Please provide a valid hex color code (e.g., #3498db or 3498db).',
        ephemeral: true
      });
    }
    
    // Defer reply
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Get all sticky messages
      const stickyMessages = stickyDb.read();
      
      // Check if a sticky message already exists for this channel
      const channelId = interaction.channel.id;
      const existingMessage = stickyMessages[channelId];
      
      // Delete existing sticky message if it exists
      if (existingMessage && existingMessage.lastMessageId) {
        try {
          const message = await interaction.channel.messages.fetch(existingMessage.lastMessageId).catch(() => null);
          if (message && !message.deleted) {
            await message.delete().catch(error => {
              logger.warn(`Failed to delete previous sticky message: ${error.message}`);
            });
          }
        } catch (error) {
          logger.warn(`Error fetching previous sticky message: ${error.message}`);
        }
      }
      
      // Create message options
      const messageOptions = {
        content: messageContent
      };
      
      // Add embed if provided
      if (embedContent) {
        messageOptions.embeds = [{
          description: embedContent,
          color: colorInt
        }];
      }
      
      // Send the sticky message
      const stickyMessage = await interaction.channel.send(messageOptions);
      
      // Save the sticky message data
      stickyMessages[channelId] = {
        content: messageContent,
        embedContent: embedContent || null,
        color: color,
        lastMessageId: stickyMessage.id,
        createdBy: interaction.user.id,
        createdAt: Date.now()
      };
      
      stickyDb.write(stickyMessages);
      
      // Success message
      await interaction.editReply({
        embeds: [{
          title: '✅ Sticky Message Set',
          description: 'The sticky message has been set for this channel.',
          fields: [
            { name: 'Channel', value: `<#${channelId}>`, inline: true },
            { name: 'Message Content', value: messageContent.length > 100 ? `${messageContent.substring(0, 100)}...` : messageContent, inline: false }
          ],
          color: parseInt(config.successColor.replace('#', ''), 16),
          timestamp: new Date().toISOString()
        }]
      });
      
      logger.info(`Sticky message set in channel #${interaction.channel.name} (${channelId}) by ${interaction.user.tag} (${interaction.user.id})`);
    } catch (error) {
      logger.error(`Error setting sticky message: ${error.message}`);
      
      await interaction.editReply({
        embeds: [{
          title: '❌ Failed to Set Sticky Message',
          description: `An error occurred: ${error.message}`,
          color: parseInt(config.errorColor.replace('#', ''), 16),
          timestamp: new Date().toISOString()
        }]
      });
    }
  },
  
  /**
   * Sets up the handler for sticky messages and reinstates all sticky messages
   * @param {Client} client - The Discord client
   */
  async handleStickyMessages(client) {
    logger.info('Setting up sticky message handler');
    
    // This is called from index.js
    try {
      // Get all sticky message configurations
      const stickyMessages = stickyDb.read();
      
      // Track the number of messages we successfully reinstate
      let reinstatedCount = 0;
      
      // Process each sticky message from the database
      for (const [channelId, stickyData] of Object.entries(stickyMessages)) {
        // Skip special entries like messageCount and locks
        if (channelId.includes('_messageCount') || channelId.includes('_lock')) {
          continue;
        }
        
        try {
          // Get the channel
          const channel = await client.channels.fetch(channelId).catch(() => null);
          
          // Skip if channel doesn't exist or bot can't access it
          if (!channel) {
            logger.warn(`Sticky message channel ${channelId} not found or inaccessible`);
            continue;
          }
          
          // Create message options
          const messageOptions = {
            content: stickyData.content,
            embeds: stickyData.embedContent ? [{
              description: stickyData.embedContent,
              color: parseInt(stickyData.color || '#3498db'.replace('#', ''), 16)
            }] : []
          };
          
          // Delete existing message if it exists
          if (stickyData.lastMessageId) {
            try {
              const message = await channel.messages.fetch(stickyData.lastMessageId).catch(() => null);
              if (message && !message.deleted) {
                await message.delete().catch(error => {
                  logger.warn(`Failed to delete previous sticky message: ${error.message}`);
                });
              }
            } catch (error) {
              logger.warn(`Error fetching previous sticky message: ${error.message}`);
            }
          }
          
          // Send new sticky message
          const newStickyMessage = await channel.send(messageOptions);
          
          // Update the sticky message data
          stickyMessages[channelId].lastMessageId = newStickyMessage.id;
          stickyMessages[channelId].lastStickyTime = Date.now();
          
          // Reset message counter for this channel
          stickyMessages[`${channelId}_messageCount`] = 0;
          
          reinstatedCount++;
          
        } catch (error) {
          logger.error(`Failed to reinstate sticky message in channel ${channelId}: ${error.message}`);
        }
      }
      
      // Save updated message IDs
      stickyDb.write(stickyMessages);
      
      if (reinstatedCount > 0) {
        logger.info(`Successfully reinstated ${reinstatedCount} sticky message(s) after bot restart`);
      } else {
        logger.info(`No sticky messages to reinstate after bot restart`);
      }
      
    } catch (error) {
      logger.error(`Error setting up sticky messages: ${error.message}`);
    }
  }
};
