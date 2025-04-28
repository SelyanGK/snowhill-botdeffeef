const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * A simple JSON file-based database utility
 */
class Database {
  /**
   * Creates a new Database instance
   * @param {string} fileName - The name of the JSON file to use as database
   */
  constructor(fileName) {
    this.filePath = path.join(__dirname, '..', 'data', fileName);
    this.ensureFileExists();
  }

  /**
   * Ensures the database file exists, creates it if it doesn't
   * @private
   */
  ensureFileExists() {
    if (!fs.existsSync(this.filePath)) {
      try {
        fs.writeFileSync(this.filePath, JSON.stringify({}));
        logger.info(`Created database file: ${this.filePath}`);
      } catch (error) {
        logger.error(`Failed to create database file: ${error.message}`);
      }
    }
  }

  /**
   * Reads the entire database
   * @returns {Object} The database content
   */
  read() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.error(`Failed to read database: ${error.message}`);
      return {};
    }
  }

  /**
   * Writes data to the database
   * @param {Object} data - The data to write
   * @returns {boolean} Success status
   */
  write(data) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      logger.error(`Failed to write to database: ${error.message}`);
      return false;
    }
  }

  /**
   * Gets a value from the database
   * @param {string} key - The key to get
   * @returns {*} The value
   */
  get(key) {
    const data = this.read();
    return data[key];
  }

  /**
   * Sets a value in the database
   * @param {string} key - The key to set
   * @param {*} value - The value to set
   * @returns {boolean} Success status
   */
  set(key, value) {
    const data = this.read();
    data[key] = value;
    return this.write(data);
  }

  /**
   * Deletes a key from the database
   * @param {string} key - The key to delete
   * @returns {boolean} Success status
   */
  delete(key) {
    const data = this.read();
    if (data[key] !== undefined) {
      delete data[key];
      return this.write(data);
    }
    return false;
  }

  /**
   * Checks if a key exists in the database
   * @param {string} key - The key to check
   * @returns {boolean} Whether the key exists
   */
  has(key) {
    const data = this.read();
    return data[key] !== undefined;
  }

  /**
   * Gets all keys in the database
   * @returns {Array} Array of keys
   */
  keys() {
    const data = this.read();
    return Object.keys(data);
  }

  /**
   * Clears the database
   * @returns {boolean} Success status
   */
  clear() {
    return this.write({});
  }
}

module.exports = Database;
