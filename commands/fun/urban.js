const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');
// Using native fetch API instead of node-fetch

module.exports = {
  data: new SlashCommandBuilder()
    .setName('urban')
    .setDescription('Look up a word on Urban Dictionary')
    .addStringOption(option =>
      option.setName('term')
        .setDescription('The term to look up')
        .setRequired(true)),
  
  cooldown: 10,
  
  /**
   * Executes the urban command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const term = interaction.options.getString('term');
      
      // Make request to Urban Dictionary API
      const response = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`);
      const data = await response.json();
      
      // Check if there are any results
      if (!data.list || data.list.length === 0) {
        return interaction.editReply(`No results found for: ${term}`);
      }
      
      // Get the first result
      const result = data.list[0];
      
      // Format the definition and example (limit to 1024 characters for embed fields)
      const definition = this.formatText(result.definition, 1024);
      const example = result.example ? this.formatText(result.example, 1024) : 'No example provided.';
      
      // Create the embed
      const embed = new EmbedBuilder()
        .setTitle(`Urban Dictionary: ${result.word}`)
        .setURL(result.permalink)
        .setColor('#1D2439') // Urban Dictionary colors
        .addFields(
          { name: 'Definition', value: definition },
          { name: 'Example', value: example },
          { name: 'Rating', value: `👍 ${result.thumbs_up} | 👎 ${result.thumbs_down}`, inline: true }
        )
        .setFooter({ text: `Submitted by ${result.author} | Requested by ${interaction.user.tag}` })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      logger.info(`User ${interaction.user.tag} looked up "${term}" in Urban Dictionary`);
    } catch (error) {
      logger.error(`Error executing urban command: ${error.message}`);
      await interaction.editReply('An error occurred while fetching from Urban Dictionary.');
    }
  },
  
  /**
   * Format and censor text from Urban Dictionary
   * @param {string} text - The text to format
   * @param {number} maxLength - Maximum length before truncating
   * @returns {string} - The formatted text
   */
  formatText(text, maxLength) {
    if (!text) return 'No text provided.';
    
    // Replace square brackets with bold markdown
    let formatted = text.replace(/\[([^\]]+)\]/g, '**$1**');
    
    // Censor profanity partially
    const profanityList = ['fuck', 'shit', 'cock', 'cunt', 'bitch', 'dick', 'pussy', 'ass', 'asshole', 'nigger', 'nigga', 'twat', 'whore', 'slut'];
    
    profanityList.forEach(word => {
      // Match the word with word boundaries to avoid matching inside other words
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      formatted = formatted.replace(regex, match => {
        // Keep first letter, replace rest with *
        return match.charAt(0) + '*'.repeat(match.length - 1);
      });
    });
    
    // Truncate if too long
    if (formatted.length > maxLength) {
      formatted = formatted.substring(0, maxLength - 3) + '...';
    }
    
    return formatted;
  }
};
