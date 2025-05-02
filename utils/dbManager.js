const Database = require('./database');
const logger = require('./logger');

// Create static database instances that will be reused throughout the application
const databases = {
  // File-based databases
  sticky: new Database('sticky.json'),
  antiping: new Database('antiping.json'),
  afk: new Database('afk.json'),
  greetings: new Database('greetings.json'),
  mentions: new Database('mentions.json'),
  autoreply: new Database('autoreply.json'),
  reminders: new Database('reminders.json'),
  giveaways: new Database('giveaways.json'),
  community_mood: new Database('community_mood.json'),
  modlogs: new Database('modlogs.json'),
  starboard: new Database('starboard.json')
};

/**
 * Gets a database instance by name
 * @param {string} name - The database name
 * @returns {Database} The database instance
 */
function getDatabase(name) {
  return databases[name] || null;
}

module.exports = {
  getDatabase,
};
