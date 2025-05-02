const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Get a user\'s avatar')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to get the avatar of')
        .setRequired(false)),
  
  cooldown: 5,
  
  /**
   * Executes the avatar command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Get the target user (or the command user if not specified)
      const targetUser = interaction.options.getUser('user') || interaction.user;
      
      // Create the embed
      const embed = new EmbedBuilder()
        .setTitle(`${targetUser.username}'s Avatar`)
        .setColor(config.embedColor)
        .setImage(targetUser.displayAvatarURL({ size: 1024, dynamic: true }))
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();
      
      // Add buttons for different formats
      const formats = ['png', 'jpg', 'webp', 'gif'];
      
      // Build button URLs
      let formatLinks = '';
      formats.forEach(format => {
        const url = targetUser.displayAvatarURL({ size: 1024, format: format, forceStatic: format !== 'gif' });
        formatLinks += `[${format.toUpperCase()}](${url}) | `;
      });
      
      // Add the links to the embed
      embed.setDescription(`**Download:** ${formatLinks.slice(0, -3)}`);
      
      await interaction.editReply({ embeds: [embed] });
      logger.info(`User ${interaction.user.tag} requested avatar for ${targetUser.tag}`);
    } catch (error) {
      logger.error(`Error executing avatar command: ${error.message}`);
      await interaction.editReply('An error occurred while fetching the avatar. Please try again.');
    }
  }
};
