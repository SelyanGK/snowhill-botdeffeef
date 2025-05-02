const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const Database = require('../utils/database');

// Create a database instance for greetings
const greetingsDb = new Database('greetings.json');

module.exports = {
  name: 'guildMemberAdd',
  
  /**
   * Executes when a new member joins the server
   * @param {GuildMember} member - The member who joined
   * @param {Client} client - The Discord client
   */
  async execute(member, client) {
    try {
      // Check if greeting system is enabled
      const greetingConfig = greetingsDb.read();
      
      if (!greetingConfig.enabled || greetingConfig.channels.length === 0) {
        return;
      }
      
      // Format the welcome message
      let messageContent = greetingConfig.message.replace('{user}', greetingConfig.ping ? member.toString() : `**${member.user.username}**`);
      
      // Keep track of sent messages for auto-deletion
      const sentMessages = [];
      
      // Loop through each configured channel
      for (const channelId of greetingConfig.channels) {
        const welcomeChannel = client.channels.cache.get(channelId);
        
        if (!welcomeChannel) {
          logger.warn(`Welcome channel ${channelId} not found for member join event`);
          continue;
        }
        
        // Send the welcome message
        try {
          let sentMessage;
          
          if (greetingConfig.withEmbed) {
            // Create an embed for the welcome message
            const embed = new EmbedBuilder()
              .setColor(greetingConfig.color || '#3498db')
              .setDescription(messageContent)
              .setTimestamp();
            
            // Add member avatar to embed
            embed.setAuthor({
              name: `Welcome to the server!`,
              iconURL: member.user.displayAvatarURL({ dynamic: true })
            });
            
            // Send the embed
            sentMessage = await welcomeChannel.send({ embeds: [embed] });
          } else {
            // Send a plain text message
            sentMessage = await welcomeChannel.send({ 
              content: messageContent,
              allowedMentions: greetingConfig.ping ? { users: [member.id] } : { parse: [] }
            });
          }
          
          // Add the message to the list for auto-deletion
          if (sentMessage && greetingConfig.deleteAfter > 0) {
            sentMessages.push(sentMessage);
          }
          
          logger.info(`Sent welcome message in #${welcomeChannel.name} for new member ${member.user.tag}`);
        } catch (channelError) {
          logger.error(`Error sending welcome message to channel ${welcomeChannel.name}: ${channelError.message}`);
        }
      }
      
      // Set up auto-deletion if configured
      if (greetingConfig.deleteAfter > 0 && sentMessages.length > 0) {
        setTimeout(() => {
          for (const message of sentMessages) {
            try {
              message.delete().catch(err => {
                logger.warn(`Failed to auto-delete welcome message: ${err.message}`);
              });
            } catch (deleteError) {
              logger.warn(`Error in auto-delete timeout for welcome message: ${deleteError.message}`);
            }
          }
          logger.info(`Auto-deleted ${sentMessages.length} welcome messages for ${member.user.tag} after ${greetingConfig.deleteAfter} seconds`);
        }, greetingConfig.deleteAfter * 1000);
      }
      
    } catch (error) {
      logger.error(`Error sending welcome message: ${error.message}`);
    }
  }
};