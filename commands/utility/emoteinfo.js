const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emoteinfo')
    .setDescription('Get information about an emoji')
    .addStringOption(option =>
      option.setName('emoji')
        .setDescription('The emoji to get information about')
        .setRequired(true)),
  
  cooldown: 5,
  
  /**
   * Executes the emoteinfo command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const emojiInput = interaction.options.getString('emoji');
      
      // Parse the emoji to get its ID (if it's a custom emoji)
      const emojiMatch = emojiInput.match(/<a?:([a-zA-Z0-9_]+):([0-9]+)>/);
      
      if (!emojiMatch) {
        // It's probably a unicode/standard emoji
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Emoji Information')
              .setDescription(`${emojiInput} is a standard Unicode emoji, not a custom server emoji.`)
              .setColor(config.embedColor)
              .setFooter({ text: 'Standard emojis don\'t have additional information' })
          ]
        });
      }
      
      // Extract emoji details
      const emojiName = emojiMatch[1];
      const emojiId = emojiMatch[2];
      const isAnimated = emojiInput.startsWith('<a:');
      
      // Try to fetch the emoji from the guild
      let guildEmoji = interaction.guild.emojis.cache.get(emojiId);
      
      // Create the embed
      const embed = new EmbedBuilder()
        .setTitle(`Emoji Information: ${emojiName}`)
        .setColor(config.embedColor)
        .setThumbnail(`https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?size=128&quality=lossless`)
        .addFields(
          { name: 'Name', value: emojiName, inline: true },
          { name: 'ID', value: emojiId, inline: true },
          { name: 'Animated', value: isAnimated ? 'Yes' : 'No', inline: true },
          { name: 'Format', value: `\${emojiInput}`, inline: false },
          { name: 'URL', value: `[Download](https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?size=4096&quality=lossless)`, inline: false }
        )
        .setTimestamp();
      
      // Add additional information if it's from this guild
      if (guildEmoji) {
        const createdAt = Math.floor(guildEmoji.createdTimestamp / 1000);
        embed.addFields(
          { name: 'Available', value: guildEmoji.available ? 'Yes' : 'No', inline: true },
          { name: 'Created', value: `<t:${createdAt}:F> (<t:${createdAt}:R>)`, inline: false }
        );
        
        if (guildEmoji.author) {
          embed.addFields({ name: 'Created By', value: `${guildEmoji.author.tag} (${guildEmoji.author.id})`, inline: false });
        }
      } else {
        embed.setDescription('This emoji is from another server.');
      }
      
      await interaction.editReply({ embeds: [embed] });
      logger.info(`User ${interaction.user.tag} requested info for emoji ${emojiName} (${emojiId})`);
    } catch (error) {
      logger.error(`Error executing emoteinfo command: ${error.message}`);
      await interaction.editReply('An error occurred while fetching emoji information. Make sure you provided a valid custom emoji.');
    }
  }
};
