const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

/**
 * Utility class for creating standardized embeds
 */
class EmbedCreator {
  /**
   * Creates a standard embed with consistent styling
   * @param {Object} options - Embed options
   * @param {string} options.title - Embed title
   * @param {string} options.description - Embed description
   * @param {string} [options.color] - Embed color (hex code)
   * @param {string} [options.footer] - Embed footer text
   * @param {string} [options.thumbnail] - Thumbnail URL
   * @param {string} [options.image] - Image URL
   * @param {Array} [options.fields] - Array of fields {name, value, inline}
   * @param {string} [options.author] - Author name
   * @param {string} [options.authorIcon] - Author icon URL
   * @returns {EmbedBuilder} - The created embed
   */
  static create(options) {
    const {
      title,
      description,
      color = config.embedColor,
      footer,
      thumbnail,
      image,
      fields,
      author,
      authorIcon,
      timestamp = true
    } = options;

    const embed = new EmbedBuilder()
      .setColor(color);
      
    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    if (footer) embed.setFooter({ text: footer });
    if (thumbnail) embed.setThumbnail(thumbnail);
    if (image) embed.setImage(image);
    if (timestamp) embed.setTimestamp();
    
    // Add author if provided
    if (author) {
      const authorOptions = { name: author };
      if (authorIcon) authorOptions.iconURL = authorIcon;
      embed.setAuthor(authorOptions);
    }
    
    // Add fields if provided
    if (fields && Array.isArray(fields)) {
      fields.forEach(field => {
        if (field.name && field.value) {
          embed.addFields({ 
            name: field.name, 
            value: field.value, 
            inline: field.inline === undefined ? false : field.inline 
          });
        }
      });
    }
    
    return embed;
  }
  
  /**
   * Creates an informational embed
   * @param {string} title - Embed title
   * @param {string} description - Embed description
   * @param {Object} [options] - Additional options
   * @returns {EmbedBuilder} - Info embed
   */
  static info(title, description, options = {}) {
    return this.create({
      title: `ℹ️ ${title}`,
      description,
      color: config.embedColor,
      ...options
    });
  }
  
  /**
   * Creates a success embed
   * @param {string} title - Embed title
   * @param {string} description - Embed description
   * @param {Object} [options] - Additional options
   * @returns {EmbedBuilder} - Success embed
   */
  static success(title, description, options = {}) {
    return this.create({
      title: `✅ ${title}`,
      description,
      color: config.successColor || '#2ecc71',
      ...options
    });
  }
  
  /**
   * Creates a warning embed
   * @param {string} title - Embed title
   * @param {string} description - Embed description
   * @param {Object} [options] - Additional options
   * @returns {EmbedBuilder} - Warning embed
   */
  static warning(title, description, options = {}) {
    return this.create({
      title: `⚠️ ${title}`,
      description,
      color: config.warningColor || '#f39c12',
      ...options
    });
  }
  
  /**
   * Creates an error embed
   * @param {string} title - Embed title
   * @param {string} description - Embed description
   * @param {Object} [options] - Additional options
   * @returns {EmbedBuilder} - Error embed
   */
  static error(title, description, options = {}) {
    return this.create({
      title: `❌ ${title}`,
      description,
      color: config.errorColor || '#e74c3c',
      ...options
    });
  }
  
  /**
   * Creates a confirmation embed
   * @param {string} title - Embed title
   * @param {string} description - Embed description
   * @param {Object} [options] - Additional options
   * @returns {EmbedBuilder} - Confirmation embed
   */
  static confirmation(title, description, options = {}) {
    return this.create({
      title: `🔔 ${title}`,
      description,
      color: '#3498db',
      ...options
    });
  }
  
  /**
   * Creates a loading embed
   * @param {string} title - Embed title
   * @param {string} description - Embed description
   * @param {Object} [options] - Additional options
   * @returns {EmbedBuilder} - Loading embed
   */
  static loading(title, description, options = {}) {
    return this.create({
      title: `⏳ ${title}`,
      description,
      color: '#9b59b6',
      ...options
    });
  }
}

module.exports = EmbedCreator;