const { ActivityType } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../config.json');

module.exports = {
  name: 'ready',
  once: true,
  /**
   * Executes when the client is ready
   * @param {Client} client - The Discord client
   */
  execute(client) {
    logger.info(`Logged in as ${client.user.tag}`);
    
    // Set bot status
    client.user.setPresence({
      activities: [{ 
        name: `${config.serverName} | /help`, 
        type: ActivityType.Watching
      }],
      status: 'online',
    });
    
    logger.info(`Bot is serving ${client.guilds.cache.size} guilds`);
    
    // Log some guild information
    client.guilds.cache.forEach(guild => {
      logger.info(`Connected to guild: ${guild.name} (${guild.id}) with ${guild.memberCount} members`);
    });
  },
};
