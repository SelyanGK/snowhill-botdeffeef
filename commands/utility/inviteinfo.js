const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inviteinfo')
    .setDescription('Get information about a Discord invite')
    .addStringOption(option =>
      option.setName('code')
        .setDescription('The invite code or URL')
        .setRequired(true)),
  
  cooldown: 10,
  
  /**
   * Executes the inviteinfo command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Get the invite code from the input
      let inviteCode = interaction.options.getString('code');
      
      // Extract the invite code if a full URL was provided
      if (inviteCode.includes('/')) {
        const urlParts = inviteCode.split('/');
        inviteCode = urlParts[urlParts.length - 1];
      }
      
      // Fetch the invite information
      const invite = await interaction.client.fetchInvite(inviteCode);
      
      if (!invite) {
        return interaction.editReply('Could not find information for that invite code.');
      }
      
      // Create an embed with the invite information
      const embed = new EmbedBuilder()
        .setTitle('Invite Information')
        .setColor(config.embedColor || '#3498db')
        .setTimestamp();
      
      if (invite.guild) {
        embed.setThumbnail(invite.guild.iconURL({ dynamic: true }));
        embed.addFields(
          { name: 'Server Name', value: invite.guild.name, inline: true },
          { name: 'Server ID', value: invite.guild.id, inline: true }
        );
        
        if (invite.guild.description) {
          embed.addFields({ name: 'Description', value: invite.guild.description });
        }
        
        if (invite.guild.features.length > 0) {
          const featureList = invite.guild.features.map(feature => 
            feature.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
          );
          embed.addFields({ name: 'Server Features', value: featureList.join(', ') });
        }
      }
      
      if (invite.channel) {
        embed.addFields(
          { name: 'Channel', value: `#${invite.channel.name}`, inline: true },
          { name: 'Channel ID', value: invite.channel.id, inline: true }
        );
      }
      
      if (invite.inviter) {
        embed.addFields({
          name: 'Invited By',
          value: `${invite.inviter.tag} (${invite.inviter.id})`,
          inline: true
        });
      }
      
      // Add expiration information if available
      if (invite.expiresAt) {
        const expiresTimestamp = Math.floor(invite.expiresAt.getTime() / 1000);
        embed.addFields({
          name: 'Expires',
          value: `<t:${expiresTimestamp}:R> (<t:${expiresTimestamp}:f>)`,
          inline: true
        });
      }
      
      if (invite.maxUses) {
        embed.addFields({
          name: 'Max Uses',
          value: `${invite.uses || 0}/${invite.maxUses}`,
          inline: true
        });
      }
      
      if (invite.createdAt) {
        const createdTimestamp = Math.floor(invite.createdAt.getTime() / 1000);
        embed.addFields({
          name: 'Created',
          value: `<t:${createdTimestamp}:R> (<t:${createdTimestamp}:f>)`,
          inline: true
        });
      }
      
      // Add verification level and member count if available
      if (invite.guild && invite.guild.verificationLevel !== undefined) {
        const verificationLevels = [
          'None',
          'Low - Must have verified email',
          'Medium - Must be registered for more than 5 minutes',
          'High - Must be a member for more than 10 minutes',
          'Very High - Must have a verified phone number'
        ];
        
        embed.addFields({
          name: 'Verification Level',
          value: verificationLevels[invite.guild.verificationLevel],
          inline: true
        });
      }
      
      if (invite.memberCount) {
        embed.addFields({
          name: 'Members',
          value: `${invite.memberCount} (${invite.presenceCount || 0} online)`,
          inline: true
        });
      }
      
      // Add server banner if available
      if (invite.guild && invite.guild.bannerURL()) {
        embed.setImage(invite.guild.bannerURL({ size: 512 }));
      }
      
      await interaction.editReply({ embeds: [embed] });
      
      logger.info(`User ${interaction.user.tag} checked invite info for code: ${inviteCode}`);
    } catch (error) {
      logger.error(`Error fetching invite info: ${error.message}`);
      await interaction.editReply('Could not fetch information for that invite. It may be invalid or expired.');
    }
  }
};