const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config.json');
const Database = require('../../utils/database');

// Sticky message database
const stickyDb = new Database('sticky.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unsticky')
    .setDescription('Remove a sticky message from the current channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  cooldown: 5,
  
  /**
   * Executes the sticky message remove command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    // Defer reply
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Get all sticky messages
      const stickyMessages = stickyDb.read();
      
      // Check if a sticky message exists for this channel
      const channelId = interaction.channel.id;
      
      if (!stickyMessages[channelId]) {
        return interaction.editReply({
          embeds: [{
            title: '❌ No Sticky Message',
            description: 'There is no sticky message set for this channel.',
            color: parseInt(config.errorColor.replace('#', ''), 16),
            timestamp: new Date().toISOString()
          }]
        });
      }
      
      // Delete the existing sticky message if it exists
      if (stickyMessages[channelId].lastMessageId) {
        try {
          const message = await interaction.channel.messages
            .fetch(stickyMessages[channelId].lastMessageId)
            .catch(() => null);
            
          if (message && !message.deleted) {
            await message.delete().catch(error => {
              logger.warn(`Failed to delete sticky message: ${error.message}`);
            });
          }
        } catch (error) {
          logger.warn(`Error fetching sticky message: ${error.message}`);
        }
      }
      
      // Remove the sticky message data
      delete stickyMessages[channelId];
      stickyDb.write(stickyMessages);
      
      // Success message
      await interaction.editReply({
        embeds: [{
          title: '✅ Sticky Message Removed',
          description: 'The sticky message has been removed from this channel.',
          fields: [
            { name: 'Channel', value: `<#${channelId}>`, inline: true }
          ],
          color: parseInt(config.successColor.replace('#', ''), 16),
          timestamp: new Date().toISOString()
        }]
      });
      
      logger.info(`Sticky message removed from channel #${interaction.channel.name} (${channelId}) by ${interaction.user.tag} (${interaction.user.id})`);
    } catch (error) {
      logger.error(`Error removing sticky message: ${error.message}`);
      
      await interaction.editReply({
        embeds: [{
          title: '❌ Failed to Remove Sticky Message',
          description: `An error occurred: ${error.message}`,
          color: parseInt(config.errorColor.replace('#', ''), 16),
          timestamp: new Date().toISOString()
        }]
      });
    }
  },
};
