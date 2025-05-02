const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banner')
    .setDescription('Get a user\'s banner')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to get the banner of')
        .setRequired(false)),
  
  cooldown: 5,
  
  /**
   * Executes the banner command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Get the target user (or the command user if not specified)
      const targetUser = interaction.options.getUser('user') || interaction.user;
      
      // Fetch the user with their banner
      const fetchedUser = await interaction.client.users.fetch(targetUser.id, { force: true });
      
      // Check if user has a banner
      const bannerURL = fetchedUser.bannerURL({ size: 4096, dynamic: true });
      
      if (!bannerURL) {
        return interaction.editReply(`${targetUser.username} doesn't have a banner set.`);
      }
      
      // Create the embed
      const embed = new EmbedBuilder()
        .setTitle(`${targetUser.username}'s Banner`)
        .setColor(fetchedUser.accentColor || config.embedColor)
        .setImage(bannerURL)
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();
      
      // Add accent color information if available
      if (fetchedUser.accentColor) {
        const hexColor = `#${fetchedUser.accentColor.toString(16).padStart(6, '0')}`;
        embed.addFields({ name: 'Accent Color', value: hexColor, inline: true });
      }
      
      // Provide direct URL to the banner
      embed.setDescription(`[**Direct Link**](${bannerURL})`);
      
      await interaction.editReply({ embeds: [embed] });
      logger.info(`User ${interaction.user.tag} requested banner for ${targetUser.tag}`);
    } catch (error) {
      logger.error(`Error executing banner command: ${error.message}`);
      await interaction.editReply('An error occurred while fetching the banner. Please try again.');
    }
  }
};
