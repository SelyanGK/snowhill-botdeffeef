const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kicks a user from the server')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('The user to kick')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('The reason for kicking')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  
  cooldown: 5,
  
  /**
   * Executes the kick command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    // Cannot kick self
    if (target.id === interaction.user.id) {
      return interaction.reply({
        content: 'You cannot kick yourself.',
        ephemeral: true
      });
    }
    
    // Cannot kick the bot
    if (target.id === interaction.client.user.id) {
      return interaction.reply({
        content: 'I cannot kick myself.',
        ephemeral: true
      });
    }
    
    // Get the member from the user
    const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
    
    // Check if the member exists
    if (!targetMember) {
      return interaction.reply({
        content: 'This user is not in the server.',
        ephemeral: true
      });
    }
    
    // Check if the member is kickable
    if (!targetMember.kickable) {
      return interaction.reply({
        content: 'I cannot kick this user. Make sure my role is higher than theirs.',
        ephemeral: true
      });
    }
    
    // Check if the executor has the permissions to kick this user
    if (interaction.member.roles.highest.position <= targetMember.roles.highest.position) {
      return interaction.reply({
        content: 'You cannot kick someone with an equal or higher role than you.',
        ephemeral: true
      });
    }
    
    // Defer the reply
    await interaction.deferReply();
    
    try {
      // Kick the member
      await targetMember.kick(reason);
      
      // Log the action
      logger.info(`${target.tag} (${target.id}) was kicked by ${interaction.user.tag} (${interaction.user.id}) for: ${reason}`);
      
      // Success message
      await interaction.editReply({
        embeds: [{
          title: '✅ User Kicked',
          description: `**${target.tag}** has been kicked from the server.`,
          fields: [
            { name: 'User', value: `<@${target.id}>`, inline: true },
            { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Reason', value: reason }
          ],
          color: parseInt(config.successColor.replace('#', ''), 16),
          timestamp: new Date().toISOString()
        }]
      });
      
      // Try to DM the user about the kick
      try {
        await target.send({
          embeds: [{
            title: `You were kicked from ${interaction.guild.name}`,
            description: `**Reason:** ${reason}`,
            color: parseInt(config.errorColor.replace('#', ''), 16),
            timestamp: new Date().toISOString(),
            footer: {
              text: interaction.guild.name,
              icon_url: interaction.guild.iconURL() || undefined
            }
          }]
        });
      } catch (error) {
        // User might have DMs disabled, just log it
        logger.warn(`Could not send DM to ${target.tag} about being kicked: ${error.message}`);
      }
    } catch (error) {
      logger.error(`Error kicking ${target.tag}: ${error.message}`);
      
      // Error message
      await interaction.editReply({
        embeds: [{
          title: '❌ Kick Failed',
          description: `Failed to kick **${target.tag}**. Please check my permissions.`,
          color: parseInt(config.errorColor.replace('#', ''), 16),
          timestamp: new Date().toISOString()
        }]
      });
    }
  },
};
