const logger = require('../utils/logger');
const communityMood = require('../utils/communityMood');

module.exports = {
  name: 'messageReactionAdd',
  
  /**
   * Executes when a reaction is added to a message
   * @param {MessageReaction} reaction - The reaction object
   * @param {User} user - The user who added the reaction
   */
  async execute(reaction, user) {
    // Check if the reaction needs to be fetched (partial reaction)
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        logger.error(`Error fetching reaction: ${error.message}`);
        return;
      }
    }
    
    // Skip if the user is a bot
    if (user.bot) return;
    
    // Track reaction for community mood
    communityMood.trackReaction(reaction, user);
  }
};