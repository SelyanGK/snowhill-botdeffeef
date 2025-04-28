const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const Database = require('../utils/database');

// Sticky messages database
const stickyDb = new Database('sticky.json');

module.exports = {
  name: 'messageCreate',
  /**
   * Executes when a message is created
   * @param {Message} message - The created message
   * @param {Client} client - The Discord client
   */
  async execute(message, client) {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Handle sticky messages functionality
    try {
      const stickyMessages = stickyDb.read();
      const channelId = message.channel.id;
      
      // Check if there's a sticky message for this channel
      if (stickyMessages[channelId]) {
        const stickyData = stickyMessages[channelId];
        
        // Delete the previous sticky message if it exists
        if (stickyData.lastMessageId) {
          try {
            const channel = client.channels.cache.get(channelId);
            if (channel) {
              const previousMessage = await channel.messages
                .fetch(stickyData.lastMessageId)
                .catch(() => null);
                
              if (previousMessage && !previousMessage.deleted) {
                await previousMessage.delete().catch(err => {
                  logger.warn(`Failed to delete previous sticky message: ${err.message}`);
                });
              }
            }
          } catch (error) {
            logger.warn(`Error managing previous sticky message: ${error.message}`);
          }
        }
        
        // Send a new sticky message
        try {
          const newStickyMessage = await message.channel.send({
            content: stickyData.content,
            embeds: stickyData.embedContent ? [{
              description: stickyData.embedContent,
              color: parseInt(stickyData.color || '#3498db'.replace('#', ''), 16)
            }] : []
          });
          
          // Update the last message ID
          stickyMessages[channelId].lastMessageId = newStickyMessage.id;
          stickyDb.write(stickyMessages);
        } catch (error) {
          logger.error(`Failed to send sticky message: ${error.message}`);
        }
      }
    } catch (error) {
      logger.error(`Error processing sticky messages: ${error.message}`);
    }
  },
};
