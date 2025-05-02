const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('channelinfo')
    .setDescription('Get information about a channel')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to get information about')
        .setRequired(false)),
  
  cooldown: 5,
  
  /**
   * Executes the channelinfo command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Get the target channel (or the current channel if not specified)
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
      
      // Get channel creation date
      const createdAt = Math.floor(targetChannel.createdTimestamp / 1000);
      
      // Get channel type in a readable format
      const channelTypeMap = {
        [ChannelType.GuildText]: 'Text Channel',
        [ChannelType.GuildVoice]: 'Voice Channel',
        [ChannelType.GuildCategory]: 'Category',
        [ChannelType.GuildAnnouncement]: 'Announcement Channel',
        [ChannelType.AnnouncementThread]: 'Announcement Thread',
        [ChannelType.PublicThread]: 'Public Thread',
        [ChannelType.PrivateThread]: 'Private Thread',
        [ChannelType.GuildStageVoice]: 'Stage Channel',
        [ChannelType.GuildForum]: 'Forum Channel',
        [ChannelType.GuildDirectory]: 'Directory Channel',
        [ChannelType.GuildMedia]: 'Media Channel'
      };
      
      const channelType = channelTypeMap[targetChannel.type] || 'Unknown Channel Type';
      
      // Get parent channel/category if applicable
      const parentInfo = targetChannel.parent
        ? `${targetChannel.parent.name} (${targetChannel.parent.id})`
        : 'None';
      
      // Create the embed
      const embed = new EmbedBuilder()
        .setTitle(`Channel Information: #${targetChannel.name}`)
        .setColor(config.embedColor)
        .addFields(
          { name: 'ID', value: targetChannel.id, inline: true },
          { name: 'Type', value: channelType, inline: true },
          { name: 'Category', value: parentInfo, inline: true },
          { name: 'Created', value: `<t:${createdAt}:F> (<t:${createdAt}:R>)`, inline: false }
        );
      
      // Add type-specific information
      if (targetChannel.type === ChannelType.GuildText || targetChannel.type === ChannelType.GuildAnnouncement) {
        // Text channel specific info
        embed.addFields(
          { name: 'Topic', value: targetChannel.topic || 'No topic set', inline: false },
          { name: 'NSFW', value: targetChannel.nsfw ? 'Yes' : 'No', inline: true },
          { name: 'Rate Limit', value: targetChannel.rateLimitPerUser > 0 ? `${targetChannel.rateLimitPerUser} seconds` : 'No slowmode', inline: true }
        );
      } else if (targetChannel.type === ChannelType.GuildVoice || targetChannel.type === ChannelType.GuildStageVoice) {
        // Voice channel specific info
        embed.addFields(
          { name: 'Bitrate', value: `${targetChannel.bitrate / 1000} kbps`, inline: true },
          { name: 'User Limit', value: targetChannel.userLimit > 0 ? `${targetChannel.userLimit} users` : 'No limit', inline: true }
        );
      } else if (targetChannel.type === ChannelType.PublicThread || targetChannel.type === ChannelType.PrivateThread || targetChannel.type === ChannelType.AnnouncementThread) {
        // Thread specific info
        embed.addFields(
          { name: 'Owner', value: targetChannel.ownerId ? `<@${targetChannel.ownerId}>` : 'Unknown', inline: true },
          { name: 'Message Count', value: `${targetChannel.messageCount || 0}`, inline: true },
          { name: 'Member Count', value: `${targetChannel.memberCount || 0}`, inline: true },
          { name: 'Archived', value: targetChannel.archived ? 'Yes' : 'No', inline: true },
          { name: 'Locked', value: targetChannel.locked ? 'Yes' : 'No', inline: true },
          { name: 'Auto Archive', value: `${targetChannel.autoArchiveDuration} minutes`, inline: true }
        );
      }
      
      // Add position information
      if (targetChannel.position !== undefined) {
        embed.addFields({ name: 'Position', value: `${targetChannel.position}`, inline: true });
      }
      
      // Add permissions information for current user
      const userPerms = targetChannel.permissionsFor(interaction.member);
      if (userPerms) {
        const keyPerms = [
          { name: 'Read', perm: 'ViewChannel', emoji: '👁️' },
          { name: 'Send', perm: 'SendMessages', emoji: '💬' },
          { name: 'Attach', perm: 'AttachFiles', emoji: '📎' },
          { name: 'Manage', perm: 'ManageChannels', emoji: '🔧' },
          { name: 'Manage Msgs', perm: 'ManageMessages', emoji: '📋' }
        ];
        
        const permText = keyPerms.map(p => 
          `${p.emoji} ${p.name}: ${userPerms.has(p.perm) ? '✅' : '❌'}`
        ).join('  ');
        
        embed.addFields({ name: 'Your Permissions', value: permText, inline: false });
      }
      
      await interaction.editReply({ embeds: [embed] });
      logger.info(`User ${interaction.user.tag} requested info for channel #${targetChannel.name} (${targetChannel.id})`);
    } catch (error) {
      logger.error(`Error executing channelinfo command: ${error.message}`);
      await interaction.editReply('An error occurred while fetching channel information. Please try again.');
    }
  }
};
