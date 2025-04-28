const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete multiple messages at once')
    .addIntegerOption(option => 
      option.setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100))
    .addUserOption(option => 
      option.setName('target')
        .setDescription('Delete messages only from this user')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  cooldown: 10,
  
  /**
   * Executes the purge command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const target = interaction.options.getUser('target');
    
    // Defer the reply as ephemeral
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Fetch messages to delete
      const messages = await interaction.channel.messages.fetch({ 
        limit: amount + 1 // Add 1 to include potential command message
      });
      
      // Filter messages by target if specified
      let messagesToDelete = messages;
      if (target) {
        messagesToDelete = messages.filter(msg => msg.author.id === target.id);
        
        // Limit to the requested amount
        const limitedMessages = new Map();
        let count = 0;
        for (const [id, msg] of messagesToDelete.entries()) {
          limitedMessages.set(id, msg);
          count++;
          if (count >= amount) break;
        }
        messagesToDelete = limitedMessages;
      }
      
      // Messages cannot be bulk deleted if they are older than 14 days
      const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
      const recentMessages = messagesToDelete.filter(msg => msg.createdTimestamp > twoWeeksAgo);
      
      // If no recent messages found
      if (recentMessages.size === 0) {
        return interaction.editReply({
          embeds: [{
            title: '❌ Purge Failed',
            description: 'No messages found that can be deleted. Messages older than 14 days cannot be bulk deleted.',
            color: parseInt(config.errorColor.replace('#', ''), 16),
            timestamp: new Date().toISOString()
          }]
        });
      }
      
      // Delete the messages
      const deleted = await interaction.channel.bulkDelete(recentMessages, true);
      
      // Log the action
      logger.info(`${interaction.user.tag} (${interaction.user.id}) purged ${deleted.size} messages in #${interaction.channel.name} (${interaction.channel.id})`);
      
      // Success message
      await interaction.editReply({
        embeds: [{
          title: '✅ Messages Purged',
          description: `Successfully deleted ${deleted.size} message(s).${
            target ? ` from user ${target.tag}` : ''
          }`,
          fields: [
            { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true },
            { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Messages Deleted', value: deleted.size.toString(), inline: true }
          ],
          color: parseInt(config.successColor.replace('#', ''), 16),
          timestamp: new Date().toISOString()
        }]
      });
    } catch (error) {
      logger.error(`Error purging messages: ${error.message}`);
      
      // Error message
      await interaction.editReply({
        embeds: [{
          title: '❌ Purge Failed',
          description: `Failed to delete messages: ${error.message}`,
          color: parseInt(config.errorColor.replace('#', ''), 16),
          timestamp: new Date().toISOString()
        }]
      });
    }
  },
};
