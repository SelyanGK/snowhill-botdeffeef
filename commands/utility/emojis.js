const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emojis')
    .setDescription('View all emojis in the server')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Filter emojis by category')
        .setRequired(false)
        .addChoices(
          { name: 'Regular', value: 'regular' },
          { name: 'Animated', value: 'animated' },
          { name: 'All', value: 'all' }
        )),
  
  cooldown: 10,
  
  /**
   * Executes the emojis command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const category = interaction.options.getString('category') || 'all';
      
      // Get the server's emojis
      const emojis = interaction.guild.emojis.cache;
      
      if (emojis.size === 0) {
        return interaction.editReply('This server doesn\'t have any custom emojis.');
      }
      
      // Filter emojis based on category
      let filteredEmojis;
      if (category === 'regular') {
        filteredEmojis = emojis.filter(emoji => !emoji.animated);
      } else if (category === 'animated') {
        filteredEmojis = emojis.filter(emoji => emoji.animated);
      } else {
        filteredEmojis = emojis;
      }
      
      if (filteredEmojis.size === 0) {
        return interaction.editReply(`This server doesn't have any ${category} emojis.`);
      }
      
      // Group emojis by category for better organization
      const groupedEmojis = {};
      
      filteredEmojis.forEach(emoji => {
        // Use the first letter as a simple grouping mechanism
        const firstLetter = emoji.name.charAt(0).toUpperCase();
        
        if (!groupedEmojis[firstLetter]) {
          groupedEmojis[firstLetter] = [];
        }
        
        // Format the emoji with its name and ID
        groupedEmojis[firstLetter].push(`${emoji} \`:${emoji.name}:\` (ID: ${emoji.id})`);
      });
      
      // Create the embeds
      const embeds = [];
      let currentEmbed = new EmbedBuilder()
        .setTitle(`Server Emojis: ${category.charAt(0).toUpperCase() + category.slice(1)}`)
        .setColor(config.embedColor);
      
      const categoryCount = category === 'all' ? 
        `${emojis.filter(e => !e.animated).size} regular, ${emojis.filter(e => e.animated).size} animated` :
        filteredEmojis.size;
      
      const totalEmojiCount = `${filteredEmojis.size} emoji${filteredEmojis.size !== 1 ? 's' : ''}`;
      currentEmbed.setDescription(`This server has **${totalEmojiCount}** in the ${category} category.${category === 'all' ? ` (${categoryCount})` : ''}`);
      
      // Add emoji groups to embeds
      const sortedGroups = Object.keys(groupedEmojis).sort();
      let embedLength = currentEmbed.data.description.length;
      
      for (const group of sortedGroups) {
        const emojisInGroup = groupedEmojis[group];
        const groupContent = emojisInGroup.join('\n');
        const fieldLength = group.length + groupContent.length;
        
        // Check if we need to start a new embed (Discord has a 6000 character limit per embed)
        if (embedLength + fieldLength > 5900) {
          embeds.push(currentEmbed);
          currentEmbed = new EmbedBuilder()
            .setTitle(`Server Emojis: ${category.charAt(0).toUpperCase() + category.slice(1)} (Continued)`)
            .setColor(config.embedColor);
          embedLength = 0;
        }
        
        currentEmbed.addFields({ name: group, value: groupContent });
        embedLength += fieldLength;
      }
      
      // Add the last embed
      embeds.push(currentEmbed);
      
      // Set footer for all embeds
      for (let i = 0; i < embeds.length; i++) {
        embeds[i].setFooter({
          text: `Page ${i + 1}/${embeds.length} • ${interaction.guild.name} • Requested by ${interaction.user.tag}`
        });
        embeds[i].setTimestamp();
      }
      
      // Send the first embed
      if (embeds.length === 1) {
        await interaction.editReply({ embeds: [embeds[0]] });
      } else {
        // Send a message with multiple embeds
        const maxEmbeds = Math.min(embeds.length, 10); // Discord limit is 10 embeds per message
        await interaction.editReply({ 
          content: `Found ${filteredEmojis.size} ${category} emojis (showing in ${maxEmbeds} pages)`,
          embeds: embeds.slice(0, maxEmbeds)
        });
      }
      
      logger.info(`User ${interaction.user.tag} used emojis command in guild ${interaction.guild.name}`);
    } catch (error) {
      logger.error(`Error executing emojis command: ${error.message}`);
      await interaction.editReply('An error occurred while retrieving the server\'s emojis.');
    }
  }
};
