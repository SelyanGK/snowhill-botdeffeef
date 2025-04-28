const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to unmute')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for unmuting')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  cooldown: 5,

  /**
   * Executes the unmute command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    try {
      const member = await interaction.guild.members.fetch(targetUser.id);
      
      // Remove timeout
      await member.timeout(null, `Unmuted by ${interaction.user.tag}: ${reason}`);
      
      // Reply to the interaction
      await interaction.reply({
        content: `Successfully unmuted ${targetUser} | Reason: ${reason}`,
        ephemeral: true
      });
      
      // Send a message to the user
      try {
        await targetUser.send({
          embeds: [{
            title: '🔊 You have been unmuted',
            description: `You have been unmuted in **${interaction.guild.name}**`,
            fields: [
              { name: 'Moderator', value: interaction.user.tag, inline: true },
              { name: 'Reason', value: reason, inline: true }
            ],
            color: 0x00ff00,
            timestamp: new Date().toISOString()
          }]
        });
      } catch (err) {
        // Ignore error if DM couldn't be sent
      }
      
      // Log the unmute
      logger.info(`${targetUser.tag} (${targetUser.id}) was unmuted by ${interaction.user.tag} (${interaction.user.id}) | Reason: ${reason}`);
    } catch (error) {
      logger.error(`Error unmuting user: ${error.message}`);
      
      await interaction.reply({
        content: `Failed to unmute user: ${error.message}`,
        ephemeral: true
      });
    }
  }
};