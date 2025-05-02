const logger = require('../utils/logger');
const snipeCommand = require('../commands/utility/snipe');

module.exports = {
  name: 'messageDelete',
  /**
   * Executes when a message is deleted
   * @param {Message} message - The deleted message
   */
  execute(message) {
    try {
      // Ignore null messages or partial messages that we can't use
      if (!message || !message.author) {
        return;
      }
      
      // Pass the deleted message to the snipe command for storage
      snipeCommand.handleMessageDelete(message);
    } catch (error) {
      logger.error(`Error handling message delete event: ${error.message}`);
    }
  }
};
