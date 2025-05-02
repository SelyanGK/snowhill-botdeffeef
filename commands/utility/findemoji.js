const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

// Common emojis organized by categories
const emojiDatabase = {
  smileys: [
    { emoji: '😀', name: 'Grinning Face', keywords: ['smile', 'happy', 'joy'] },
    { emoji: '😁', name: 'Grinning Face with Smiling Eyes', keywords: ['smile', 'happy', 'joy', 'grin'] },
    { emoji: '😂', name: 'Face with Tears of Joy', keywords: ['laugh', 'happy', 'joy', 'lol', 'tears'] },
    { emoji: '🙂', name: 'Slightly Smiling Face', keywords: ['smile', 'neutral', 'slight'] },
    { emoji: '😊', name: 'Smiling Face with Smiling Eyes', keywords: ['smile', 'happy', 'warm', 'blush'] },
    { emoji: '😍', name: 'Smiling Face with Heart-Eyes', keywords: ['love', 'crush', 'heart', 'adore'] }
  ],
  emotions: [
    { emoji: '😒', name: 'Unamused Face', keywords: ['unimpressed', 'skeptical', 'disappointed'] },
    { emoji: '😔', name: 'Pensive Face', keywords: ['sad', 'disappointed', 'reflective'] },
    { emoji: '😎', name: 'Smiling Face with Sunglasses', keywords: ['cool', 'sunglasses', 'swagger'] },
    { emoji: '🙄', name: 'Face with Rolling Eyes', keywords: ['sarcasm', 'unimpressed', 'annoyed'] },
    { emoji: '😠', name: 'Angry Face', keywords: ['anger', 'mad', 'annoyed', 'fury'] },
    { emoji: '😢', name: 'Crying Face', keywords: ['sad', 'tear', 'unhappy'] }
  ],
  animals: [
    { emoji: '🐶', name: 'Dog Face', keywords: ['dog', 'pet', 'puppy', 'woof'] },
    { emoji: '🐱', name: 'Cat Face', keywords: ['cat', 'pet', 'kitten', 'meow'] },
    { emoji: '🐭', name: 'Mouse Face', keywords: ['mouse', 'rodent', 'pet'] },
    { emoji: '🦊', name: 'Fox Face', keywords: ['fox', 'animal', 'clever'] },
    { emoji: '🦁', name: 'Lion Face', keywords: ['lion', 'animal', 'brave', 'fierce'] },
    { emoji: '🐸', name: 'Frog Face', keywords: ['frog', 'animal', 'amphibian'] }
  ],
  food: [
    { emoji: '🍎', name: 'Red Apple', keywords: ['fruit', 'food', 'healthy'] },
    { emoji: '🍕', name: 'Pizza', keywords: ['food', 'italian', 'cheese'] },
    { emoji: '🍔', name: 'Hamburger', keywords: ['food', 'fast food', 'burger'] },
    { emoji: '🍦', name: 'Soft Ice Cream', keywords: ['ice cream', 'dessert', 'sweet'] },
    { emoji: '🍫', name: 'Chocolate Bar', keywords: ['chocolate', 'sweet', 'dessert'] },
    { emoji: '☕', name: 'Hot Beverage', keywords: ['coffee', 'tea', 'drink', 'hot'] }
  ],
  objects: [
    { emoji: '💻', name: 'Laptop', keywords: ['computer', 'work', 'technology'] },
    { emoji: '📱', name: 'Mobile Phone', keywords: ['phone', 'cell', 'technology'] },
    { emoji: '⏰', name: 'Alarm Clock', keywords: ['time', 'wake up', 'alert'] },
    { emoji: '🔑', name: 'Key', keywords: ['lock', 'unlock', 'access'] },
    { emoji: '🎮', name: 'Video Game', keywords: ['game', 'controller', 'play'] },
    { emoji: '💡', name: 'Light Bulb', keywords: ['idea', 'light', 'bright'] }
  ],
  symbols: [
    { emoji: '❤️', name: 'Red Heart', keywords: ['heart', 'love', 'red'] },
    { emoji: '✨', name: 'Sparkles', keywords: ['sparkle', 'shine', 'glitter'] },
    { emoji: '🔥', name: 'Fire', keywords: ['flame', 'hot', 'burn', 'lit'] },
    { emoji: '⭐', name: 'Star', keywords: ['rating', 'favorite', 'gold'] },
    { emoji: '💯', name: 'Hundred Points', keywords: ['score', 'perfect', 'hundred'] },
    { emoji: '🎉', name: 'Party Popper', keywords: ['celebration', 'party', 'congratulations'] }
  ],
  flags: [
    { emoji: '🏳️', name: 'White Flag', keywords: ['surrender', 'peace', 'truce'] },
    { emoji: '🏴', name: 'Black Flag', keywords: ['pirate', 'rebellion'] },
    { emoji: '🏁', name: 'Chequered Flag', keywords: ['racing', 'finish', 'race'] },
    { emoji: '🚩', name: 'Triangular Flag', keywords: ['marker', 'warning', 'attention'] },
    { emoji: '🏳️‍🌈', name: 'Rainbow Flag', keywords: ['pride', 'lgbt', 'rainbow'] },
    { emoji: '🏳️‍⚧️', name: 'Transgender Flag', keywords: ['transgender', 'pride', 'lgbt'] }
  ]
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('findemoji')
    .setDescription('Find and get information about emojis')
    .addSubcommand(subcommand =>
      subcommand
        .setName('search')
        .setDescription('Search for emojis by keyword')
        .addStringOption(option =>
          option.setName('query')
            .setDescription('Keyword to search for')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('Get information about an emoji')
        .addStringOption(option =>
          option.setName('emoji')
            .setDescription('The emoji to get information about')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('category')
        .setDescription('Browse emojis by category')
        .addStringOption(option =>
          option.setName('category')
            .setDescription('Emoji category to browse')
            .setRequired(true)
            .addChoices(
              { name: 'Smileys', value: 'smileys' },
              { name: 'Emotions', value: 'emotions' },
              { name: 'Animals', value: 'animals' },
              { name: 'Food', value: 'food' },
              { name: 'Objects', value: 'objects' },
              { name: 'Symbols', value: 'symbols' },
              { name: 'Flags', value: 'flags' }
            ))),
  
  cooldown: 5,
  
  /**
   * Executes the findemoji command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'search') {
      await this.searchEmojis(interaction);
    } else if (subcommand === 'info') {
      await this.getEmojiInfo(interaction);
    } else if (subcommand === 'category') {
      await this.browseCategory(interaction);
    }
    
    logger.info(`User ${interaction.user.tag} used findemoji command: ${subcommand}`);
  },
  
  /**
   * Search for emojis by keyword
   * @param {Interaction} interaction - The interaction
   */
  async searchEmojis(interaction) {
    await interaction.deferReply();
    
    try {
      const query = interaction.options.getString('query').toLowerCase();
      
      // Search all emojis for matching keywords or names
      const results = [];
      
      Object.keys(emojiDatabase).forEach(category => {
        emojiDatabase[category].forEach(emoji => {
          if (
            emoji.name.toLowerCase().includes(query) ||
            emoji.keywords.some(keyword => keyword.includes(query))
          ) {
            results.push({
              emoji: emoji.emoji,
              name: emoji.name,
              category: category.charAt(0).toUpperCase() + category.slice(1),
              keywords: emoji.keywords.join(', ')
            });
          }
        });
      });
      
      if (results.length === 0) {
        return interaction.editReply(`No emojis found matching "${query}". Try a different search term.`);
      }
      
      // Limit to first 10 results to avoid overflow
      const limitedResults = results.slice(0, 10);
      
      // Create an embed with the search results
      const embed = new EmbedBuilder()
        .setTitle(`Emoji Search Results for "${query}"`)
        .setDescription(`Found ${results.length} emoji${results.length === 1 ? '' : 's'} matching your search.`)
        .setColor(config.embedColor || '#3498db')
        .setFooter({ text: `Showing ${limitedResults.length} of ${results.length} results` })
        .setTimestamp();
      
      limitedResults.forEach((result, index) => {
        embed.addFields({
          name: `${result.emoji} ${result.name}`,
          value: `Category: ${result.category}\nKeywords: ${result.keywords}`
        });
      });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error(`Error searching emojis: ${error.message}`);
      await interaction.editReply('An error occurred while searching for emojis.');
    }
  },
  
  /**
   * Get information about a specific emoji
   * @param {Interaction} interaction - The interaction
   */
  async getEmojiInfo(interaction) {
    await interaction.deferReply();
    
    try {
      const emojiInput = interaction.options.getString('emoji');
      
      // Check if this is a Discord custom emoji
      const customEmojiRegex = /<(a)?:\w+:(\d+)>/;
      const customEmojiMatch = emojiInput.match(customEmojiRegex);
      
      if (customEmojiMatch) {
        const isAnimated = Boolean(customEmojiMatch[1]);
        const emojiId = customEmojiMatch[2];
        const emojiName = emojiInput.split(':')[1];
        
        const embed = new EmbedBuilder()
          .setTitle(`Custom Emoji: ${emojiName}`)
          .setDescription(`This is a custom Discord emoji from a server.`)
          .setColor(config.embedColor || '#3498db')
          .addFields(
            { name: 'Emoji ID', value: emojiId, inline: true },
            { name: 'Animated', value: isAnimated ? 'Yes' : 'No', inline: true }
          )
          .setThumbnail(`https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?v=1`)
          .setTimestamp();
        
        return interaction.editReply({ embeds: [embed] });
      }
      
      // Handle unicode emoji
      // Try to find the emoji in our database
      let foundEmoji = null;
      let foundCategory = '';
      
      Object.keys(emojiDatabase).forEach(category => {
        const emoji = emojiDatabase[category].find(e => e.emoji === emojiInput);
        if (emoji) {
          foundEmoji = emoji;
          foundCategory = category;
        }
      });
      
      if (!foundEmoji) {
        return interaction.editReply(
          'Could not identify that emoji. Please try again with a different emoji or use the search command.'
        );
      }
      
      // Get the unicode code points
      const codePoints = [...foundEmoji.emoji].map(char => {
        return 'U+' + char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
      }).join(' ');
      
      const embed = new EmbedBuilder()
        .setTitle(`${foundEmoji.emoji} ${foundEmoji.name}`)
        .setDescription(`Type \`:${foundEmoji.name.toLowerCase().replace(/\s+/g, '_')}:\` to use this emoji.`)
        .setColor(config.embedColor || '#3498db')
        .addFields(
          { name: 'Category', value: foundCategory.charAt(0).toUpperCase() + foundCategory.slice(1), inline: true },
          { name: 'Keywords', value: foundEmoji.keywords.join(', '), inline: true },
          { name: 'Unicode', value: codePoints }
        )
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error(`Error getting emoji info: ${error.message}`);
      await interaction.editReply('An error occurred while getting emoji information.');
    }
  },
  
  /**
   * Browse emojis by category
   * @param {Interaction} interaction - The interaction
   */
  async browseCategory(interaction) {
    await interaction.deferReply();
    
    try {
      const category = interaction.options.getString('category');
      const emojis = emojiDatabase[category] || [];
      
      if (emojis.length === 0) {
        return interaction.editReply('No emojis found in this category.');
      }
      
      // Create a grid of emojis (3 per row)
      const emojiGrid = [];
      for (let i = 0; i < emojis.length; i += 3) {
        const row = emojis.slice(i, i + 3).map(emoji => emoji.emoji).join(' ');
        emojiGrid.push(row);
      }
      
      const embed = new EmbedBuilder()
        .setTitle(`${category.charAt(0).toUpperCase() + category.slice(1)} Emojis`)
        .setDescription(emojiGrid.join('\n'))
        .setColor(config.embedColor || '#3498db')
        .setFooter({ text: 'Use /findemoji info <emoji> to get more information about an emoji' })
        .setTimestamp();
      
      // Add a field listing all emojis with their names
      embed.addFields({
        name: 'Emoji List',
        value: emojis.map(emoji => `${emoji.emoji} - ${emoji.name}`).join('\n')
      });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error(`Error browsing emoji category: ${error.message}`);
      await interaction.editReply('An error occurred while browsing emoji category.');
    }
  }
};