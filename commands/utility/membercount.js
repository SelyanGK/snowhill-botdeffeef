const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('membercount')
    .setDescription('Shows the current member count of the server'),
  
  cooldown: 5,
  
  /**
   * Executes the membercount command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const guild = interaction.guild;
      
      // Fetch the complete member list to get accurate counts
      await guild.members.fetch();
      
      // Count members, bots, and humans
      const totalMembers = guild.memberCount;
      const botCount = guild.members.cache.filter(member => member.user.bot).size;
      const humanCount = totalMembers - botCount;
      
      // Count members by status (requires GUILD_PRESENCES intent)
      const onlineCount = guild.members.cache.filter(member => member.presence?.status === 'online').size;
      const idleCount = guild.members.cache.filter(member => member.presence?.status === 'idle').size;
      const dndCount = guild.members.cache.filter(member => member.presence?.status === 'dnd').size;
      const offlineCount = guild.members.cache.filter(member => !member.presence || member.presence.status === 'offline').size;
      
      // Create the embed
      const embed = new EmbedBuilder()
        .setTitle(`${guild.name} - Member Count`)
        .setThumbnail(guild.iconURL({ dynamic: true, size: 128 }))
        .setColor(config.embedColor)
        .addFields(
          { name: 'Total Members', value: `${totalMembers}`, inline: true },
          { name: 'Humans', value: `${humanCount}`, inline: true },
          { name: 'Bots', value: `${botCount}`, inline: true }
        )
        .setFooter({ text: `Server created on: ${new Date(guild.createdTimestamp).toLocaleDateString()}` })
        .setTimestamp();
      
      // Only add status counts if we have presence data (requires special intents)
      if (onlineCount > 0 || idleCount > 0 || dndCount > 0) {
        embed.addFields(
          { name: 'Online', value: `${onlineCount}`, inline: true },
          { name: 'Idle', value: `${idleCount}`, inline: true },
          { name: 'Do Not Disturb', value: `${dndCount}`, inline: true },
          { name: 'Offline', value: `${offlineCount}`, inline: true }
        );
      }
      
      await interaction.editReply({ embeds: [embed] });
      logger.info(`User ${interaction.user.tag} checked member count in ${guild.name}`);
    } catch (error) {
      logger.error(`Error executing membercount command: ${error.message}`);
      await interaction.editReply('An error occurred while fetching the member count.');
    }
  }
};
