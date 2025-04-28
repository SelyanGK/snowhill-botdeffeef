const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a user from the server')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('The user to ban')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('The reason for banning')
        .setRequired(false))
    .addIntegerOption(option => 
      option.setName('days')
        .setDescription('Number of days of messages to delete (0-7)')
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(7))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  
  cooldown: 5,
  
  /**
   * Executes the ban command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteMessageDays = interaction.options.getInteger('days') || 1;
    
    // Cannot ban self
    if (target.id === interaction.user.id) {
      return interaction.reply({
        content: 'You cannot ban yourself.',
        ephemeral: true
      });
    }
    
    // Cannot ban the bot
    if (target.id === interaction.client.user.id) {
      return interaction.reply({
        content: 'I cannot ban myself.',
        ephemeral: true
      });
    }
    
    // Get the member from the user
    const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
    
    // If the target is in the server, check if they are bannable
    if (targetMember) {
      // Check if the member is bannable
      if (!targetMember.bannable) {
        return interaction.reply({
          content: 'I cannot ban this user. Make sure my role is higher than theirs.',
          ephemeral: true
        });
      }
      
      // Check if the executor has the permissions to ban this user
      if (interaction.member.roles.highest.position <= targetMember.roles.highest.position) {
        return interaction.reply({
          content: 'You cannot ban someone with an equal or higher role than you.',
          ephemeral: true
        });
      }
    }
    
    // Defer the reply
    await interaction.deferReply();
    
    try {
      // Try to DM the user about the ban before actually banning them
      try {
        if (targetMember) {
          await target.send({
            embeds: [{
              title: `You were banned from ${interaction.guild.name}`,
              description: `**Reason:** ${reason}`,
              color: parseInt(config.errorColor.replace('#', ''), 16),
              timestamp: new Date().toISOString(),
              footer: {
                text: interaction.guild.name,
                icon_url: interaction.guild.iconURL() || undefined
              }
            }]
          });
        }
      } catch (error) {
        // User might have DMs disabled, just log it
        logger.warn(`Could not send DM to ${target.tag} about being banned: ${error.message}`);
      }
      
      // Ban the user
      await interaction.guild.members.ban(target, {
        deleteMessageDays,
        reason: `${reason} - Banned by ${interaction.user.tag}`
      });
      
      // Log the action
      logger.info(`${target.tag} (${target.id}) was banned by ${interaction.user.tag} (${interaction.user.id}) for: ${reason}`);
      
      // Success message
      await interaction.editReply({
        embeds: [{
          title: '✅ User Banned',
          description: `**${target.tag}** has been banned from the server.`,
          fields: [
            { name: 'User', value: `<@${target.id}>`, inline: true },
            { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Reason', value: reason },
            { name: 'Message Deletion', value: `${deleteMessageDays} day(s)` }
          ],
          color: parseInt(config.successColor.replace('#', ''), 16),
          timestamp: new Date().toISOString()
        }]
      });
    } catch (error) {
      logger.error(`Error banning ${target.tag}: ${error.message}`);
      
      // Error message
      await interaction.editReply({
        embeds: [{
          title: '❌ Ban Failed',
          description: `Failed to ban **${target.tag}**. Please check my permissions.`,
          color: parseInt(config.errorColor.replace('#', ''), 16),
          timestamp: new Date().toISOString()
        }]
      });
    }
  },
};
