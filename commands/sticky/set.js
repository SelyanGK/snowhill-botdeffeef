const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config.json');
const Database = require('../../utils/database');

// Sticky message database
const stickyDb = new Database('sticky.json');

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
   * Sets up the handler for sticky messages
   * @param {Client} client - The Discord client
   */
  handleStickyMessages(client) {
    logger.info('Setting up sticky message handler');
    
    // This is called from index.js
    // The actual handling of sticky messages is in the messageCreate event
  }
};
