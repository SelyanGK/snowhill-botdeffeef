const logger = require('../utils/logger');

module.exports = {
  name: 'messageReactionRemove',
  
  /**
   * Executes when a reaction is removed from a message
   * @param {MessageReaction} reaction - The reaction object
   * @param {User} user - The user who removed the reaction
   */
  async execute(reaction, user) {
    // Check if the reaction needs to be fetched (partial reaction)
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        logger.error(`Error fetching removed reaction: ${error.message}`);
        return;
      }
    }
    
    // We don't track reaction removals for community mood currently,
    // but we can log them for debugging purposes
    if (!user.bot) {
      logger.debug(`User ${user.tag} removed reaction ${reaction.emoji.name} from a message`);
    }
  }
};