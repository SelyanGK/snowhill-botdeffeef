const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a user in the server')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('The user to timeout')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('duration')
        .setDescription('Duration of the timeout (1m, 1h, 1d, etc)')
        .setRequired(true)
        .addChoices(
          { name: '60 seconds', value: '60s' },
          { name: '5 minutes', value: '5m' },
          { name: '10 minutes', value: '10m' },
          { name: '1 hour', value: '1h' },
          { name: '1 day', value: '1d' },
          { name: '1 week', value: '1w' },
          { name: 'Remove timeout', value: '0' }
        ))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('The reason for the timeout')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  
  cooldown: 5,
  
  /**
   * Executes the timeout command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const durationString = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    // Parse the duration
    let durationMs = 0;
    
    if (durationString !== '0') {
      const regex = /^(\d+)([smhdw])$/;
      const match = durationString.match(regex);
      
      if (!match) {
        return interaction.reply({
          content: 'Invalid duration format. Use 1m, 1h, 1d, etc.',
          ephemeral: true
        });
      }
      
      const value = parseInt(match[1]);
      const unit = match[2];
      
      switch (unit) {
        case 's': durationMs = value * 1000; break;
        case 'm': durationMs = value * 60 * 1000; break;
        case 'h': durationMs = value * 60 * 60 * 1000; break;
        case 'd': durationMs = value * 24 * 60 * 60 * 1000; break;
        case 'w': durationMs = value * 7 * 24 * 60 * 60 * 1000; break;
      }
      
      // Discord's max timeout duration is 28 days
      const maxTimeout = 28 * 24 * 60 * 60 * 1000;
      if (durationMs > maxTimeout) {
        return interaction.reply({
          content: 'Timeout duration cannot exceed 28 days',
          ephemeral: true
        });
      }
    }
    
    // Cannot timeout self
    if (target.id === interaction.user.id) {
      return interaction.reply({
        content: 'You cannot timeout yourself.',
        ephemeral: true
      });
    }
    
    // Cannot timeout the bot
    if (target.id === interaction.client.user.id) {
      return interaction.reply({
        content: 'I cannot timeout myself.',
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
    
    // Check if the member can be timed out
    if (!targetMember.moderatable) {
      return interaction.reply({
        content: 'I cannot timeout this user. Make sure my role is higher than theirs.',
        ephemeral: true
      });
    }
    
    // Check if the executor has the permissions to timeout this user
    if (interaction.member.roles.highest.position <= targetMember.roles.highest.position) {
      return interaction.reply({
        content: 'You cannot timeout someone with an equal or higher role than you.',
        ephemeral: true
      });
    }
    
    // Defer the reply
    await interaction.deferReply();
    
    try {
      // Set timeout or remove timeout
      if (durationString === '0') {
        await targetMember.timeout(null, reason);
        
        // Log the action
        logger.info(`Timeout removed from ${target.tag} (${target.id}) by ${interaction.user.tag} (${interaction.user.id})`);
        
        // Success message
        await interaction.editReply({
          embeds: [{
            title: '✅ Timeout Removed',
            description: `Timeout has been removed from **${target.tag}**.`,
            fields: [
              { name: 'User', value: `<@${target.id}>`, inline: true },
              { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Reason', value: reason }
            ],
            color: parseInt(config.successColor.replace('#', ''), 16),
            timestamp: new Date().toISOString()
          }]
        });
      } else {
        await targetMember.timeout(durationMs, reason);
        
        // Format the duration for display
        const endTime = new Date(Date.now() + durationMs);
        const formattedDuration = `<t:${Math.floor(endTime.getTime() / 1000)}:R>`;
        
        // Log the action
        logger.info(`${target.tag} (${target.id}) was timed out by ${interaction.user.tag} (${interaction.user.id}) for: ${reason} - Duration: ${durationString}`);
        
        // Success message
        await interaction.editReply({
          embeds: [{
            title: '✅ User Timed Out',
            description: `**${target.tag}** has been timed out.`,
            fields: [
              { name: 'User', value: `<@${target.id}>`, inline: true },
              { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Duration', value: `Until ${formattedDuration}`, inline: true },
              { name: 'Reason', value: reason }
            ],
            color: parseInt(config.successColor.replace('#', ''), 16),
            timestamp: new Date().toISOString()
          }]
        });
        
        // Try to DM the user about the timeout
        try {
          await target.send({
            embeds: [{
              title: `You were timed out in ${interaction.guild.name}`,
              description: `**Reason:** ${reason}\n**Duration:** Until ${formattedDuration}`,
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
          logger.warn(`Could not send DM to ${target.tag} about being timed out: ${error.message}`);
        }
      }
    } catch (error) {
      logger.error(`Error timing out ${target.tag}: ${error.message}`);
      
      // Error message
      await interaction.editReply({
        embeds: [{
          title: '❌ Timeout Failed',
          description: `Failed to timeout **${target.tag}**. Please check my permissions.`,
          color: parseInt(config.errorColor.replace('#', ''), 16),
          timestamp: new Date().toISOString()
        }]
      });
    }
  },
};
