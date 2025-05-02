const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverbanner')
    .setDescription('Shows the current server banner'),
  
  cooldown: 5,
  
  /**
   * Executes the serverbanner command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const guild = interaction.guild;
      
      // Check if the server has a banner
      if (!guild.banner) {
        return interaction.editReply('This server does not have a banner set.');
      }
      
      // Get the banner URL with size 4096 (highest quality)
      const bannerURL = guild.bannerURL({ size: 4096, dynamic: true });
      
      // Create the embed
      const embed = new EmbedBuilder()
        .setTitle(`${guild.name}'s Banner`)
        .setDescription(`[Banner URL](${bannerURL})`)
        .setImage(bannerURL)
        .setColor(guild.members.me?.displayHexColor || config.embedColor)
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      logger.info(`User ${interaction.user.tag} viewed server banner in ${guild.name}`);
    } catch (error) {
      logger.error(`Error executing serverbanner command: ${error.message}`);
      await interaction.editReply('An error occurred while fetching the server banner.');
    }
  }
};
