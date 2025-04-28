const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Get current date for log file name
const currentDate = new Date().toISOString().split('T')[0];
const logFile = path.join(logsDir, `${currentDate}.log`);

/**
 * Formats a log message with timestamp and level
 * @param {string} level - Log level (INFO, WARN, ERROR)
 * @param {string} message - Message to log
 * @returns {string} - Formatted log message
 */
function formatLogMessage(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

/**
 * Writes a message to the log file
 * @param {string} message - Formatted message to write
 */
function writeToFile(message) {
  fs.appendFile(logFile, message + '\n', (err) => {
    if (err) console.error(`Failed to write to log file: ${err.message}`);
  });
}

const logger = {
  /**
   * Logs an informational message
   * @param {string} message - Message to log
   */
  info(message) {
    const formattedMessage = formatLogMessage('INFO', message);
    console.log('\x1b[32m%s\x1b[0m', formattedMessage);
    writeToFile(formattedMessage);
  },

  /**
   * Logs a warning message
   * @param {string} message - Message to log
   */
  warn(message) {
    const formattedMessage = formatLogMessage('WARN', message);
    console.log('\x1b[33m%s\x1b[0m', formattedMessage);
    writeToFile(formattedMessage);
  },

  /**
   * Logs an error message
   * @param {string} message - Message to log
   */
  error(message) {
    const formattedMessage = formatLogMessage('ERROR', message);
    console.error('\x1b[31m%s\x1b[0m', formattedMessage);
    writeToFile(formattedMessage);
  },

  /**
   * Logs a debug message (only in development)
   * @param {string} message - Message to log
   */
  debug(message) {
    if (process.env.NODE_ENV === 'development') {
      const formattedMessage = formatLogMessage('DEBUG', message);
      console.log('\x1b[36m%s\x1b[0m', formattedMessage);
      writeToFile(formattedMessage);
    }
  }
};

module.exports = logger;
