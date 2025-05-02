const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, PermissionsBitField } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config.json');

// List of all discord.js permissions with descriptions
const PERMISSION_DESCRIPTIONS = [
  { flag: PermissionFlagsBits.CreateInstantInvite, name: 'Create Invite', description: 'Allows creating invites to the server' },
  { flag: PermissionFlagsBits.KickMembers, name: 'Kick Members', description: 'Allows kicking members from the server' },
  { flag: PermissionFlagsBits.BanMembers, name: 'Ban Members', description: 'Allows banning members from the server' },
  { flag: PermissionFlagsBits.Administrator, name: 'Administrator', description: 'Grants all permissions and bypasses channel permission overwrites' },
  { flag: PermissionFlagsBits.ManageChannels, name: 'Manage Channels', description: 'Allows managing and editing channels' },
  { flag: PermissionFlagsBits.ManageGuild, name: 'Manage Server', description: 'Allows managing server settings' },
  { flag: PermissionFlagsBits.AddReactions, name: 'Add Reactions', description: 'Allows adding reactions to messages' },
  { flag: PermissionFlagsBits.ViewAuditLog, name: 'View Audit Log', description: 'Allows viewing the server audit log' },
  { flag: PermissionFlagsBits.PrioritySpeaker, name: 'Priority Speaker', description: 'Allows speaking with priority in voice channels' },
  { flag: PermissionFlagsBits.Stream, name: 'Video', description: 'Allows streaming video in voice channels' },
  { flag: PermissionFlagsBits.ViewChannel, name: 'View Channels', description: 'Allows viewing channels' },
  { flag: PermissionFlagsBits.SendMessages, name: 'Send Messages', description: 'Allows sending messages in text channels' },
  { flag: PermissionFlagsBits.SendTTSMessages, name: 'Send TTS Messages', description: 'Allows sending text-to-speech messages' },
  { flag: PermissionFlagsBits.ManageMessages, name: 'Manage Messages', description: 'Allows managing messages of other users' },
  { flag: PermissionFlagsBits.EmbedLinks, name: 'Embed Links', description: 'Allows embedding links in messages' },
  { flag: PermissionFlagsBits.AttachFiles, name: 'Attach Files', description: 'Allows attaching files in messages' },
  { flag: PermissionFlagsBits.ReadMessageHistory, name: 'Read Message History', description: 'Allows reading message history in channels' },
  { flag: PermissionFlagsBits.MentionEveryone, name: 'Mention @everyone, @here, and All Roles', description: 'Allows using @everyone, @here, and mentioning all roles' },
  { flag: PermissionFlagsBits.UseExternalEmojis, name: 'Use External Emojis', description: 'Allows using emojis from other servers' },
  { flag: PermissionFlagsBits.ViewGuildInsights, name: 'View Server Insights', description: 'Allows viewing server insights' },
  { flag: PermissionFlagsBits.Connect, name: 'Connect', description: 'Allows connecting to voice channels' },
  { flag: PermissionFlagsBits.Speak, name: 'Speak', description: 'Allows speaking in voice channels' },
  { flag: PermissionFlagsBits.MuteMembers, name: 'Mute Members', description: 'Allows muting members in voice channels' },
  { flag: PermissionFlagsBits.DeafenMembers, name: 'Deafen Members', description: 'Allows deafening members in voice channels' },
  { flag: PermissionFlagsBits.MoveMembers, name: 'Move Members', description: 'Allows moving members between voice channels' },
  { flag: PermissionFlagsBits.UseVAD, name: 'Use Voice Activity', description: 'Allows using voice activity detection' },
  { flag: PermissionFlagsBits.ChangeNickname, name: 'Change Nickname', description: 'Allows changing own nickname' },
  { flag: PermissionFlagsBits.ManageNicknames, name: 'Manage Nicknames', description: 'Allows managing nicknames of other members' },
  { flag: PermissionFlagsBits.ManageRoles, name: 'Manage Roles', description: 'Allows managing roles' },
  { flag: PermissionFlagsBits.ManageWebhooks, name: 'Manage Webhooks', description: 'Allows managing webhooks' },
  { flag: PermissionFlagsBits.ManageEmojisAndStickers, name: 'Manage Emojis and Stickers', description: 'Allows managing emojis and stickers' },
  { flag: PermissionFlagsBits.UseApplicationCommands, name: 'Use Application Commands', description: 'Allows using application commands (slash commands)' },
  { flag: PermissionFlagsBits.RequestToSpeak, name: 'Request to Speak', description: 'Allows requesting to speak in stage channels' },
  { flag: PermissionFlagsBits.ManageEvents, name: 'Manage Events', description: 'Allows managing server events' },
  { flag: PermissionFlagsBits.ManageThreads, name: 'Manage Threads', description: 'Allows managing threads' },
  { flag: PermissionFlagsBits.CreatePublicThreads, name: 'Create Public Threads', description: 'Allows creating public threads' },
  { flag: PermissionFlagsBits.CreatePrivateThreads, name: 'Create Private Threads', description: 'Allows creating private threads' },
  { flag: PermissionFlagsBits.UseExternalStickers, name: 'Use External Stickers', description: 'Allows using stickers from other servers' },
  { flag: PermissionFlagsBits.SendMessagesInThreads, name: 'Send Messages in Threads', description: 'Allows sending messages in threads' },
  { flag: PermissionFlagsBits.UseEmbeddedActivities, name: 'Use Activities', description: 'Allows using activities (like games) in voice channels' },
  { flag: PermissionFlagsBits.ModerateMembers, name: 'Timeout Members', description: 'Allows applying timeouts to members' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('permissions')
    .setDescription('Check permissions for a user or in a channel')
    .addSubcommand(subcommand =>
      subcommand
        .setName('user')
        .setDescription('Check permissions for a user')
        .addUserOption(option =>
          option.setName('target')
            .setDescription('The user to check permissions for')
            .setRequired(false))
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to check permissions in')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('role')
        .setDescription('Check permissions for a role')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to check permissions for')
            .setRequired(true))
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to check permissions in')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('explain')
        .setDescription('Explain a specific permission')
        .addStringOption(option =>
          option.setName('permission')
            .setDescription('The permission to explain')
            .setRequired(true)
            .addChoices(
              { name: 'Administrator', value: 'Administrator' },
              { name: 'Manage Server', value: 'Manage Server' },
              { name: 'Manage Channels', value: 'Manage Channels' },
              { name: 'Manage Roles', value: 'Manage Roles' },
              { name: 'Kick Members', value: 'Kick Members' },
              { name: 'Ban Members', value: 'Ban Members' },
              { name: 'Manage Messages', value: 'Manage Messages' },
              { name: 'Mention Everyone', value: 'Mention @everyone, @here, and All Roles' },
              { name: 'Timeout Members', value: 'Timeout Members' },
              { name: 'Create Invite', value: 'Create Invite' },
              { name: 'Manage Webhooks', value: 'Manage Webhooks' },
              { name: 'Manage Emojis and Stickers', value: 'Manage Emojis and Stickers' },
              { name: 'View Audit Log', value: 'View Audit Log' },
              { name: 'View Channel', value: 'View Channels' },
              { name: 'Send Messages', value: 'Send Messages' },
              { name: 'Read Message History', value: 'Read Message History' },
              { name: 'Connect', value: 'Connect' },
              { name: 'Speak', value: 'Speak' },
              { name: 'Mute Members', value: 'Mute Members' },
              { name: 'Deafen Members', value: 'Deafen Members' },
              { name: 'Move Members', value: 'Move Members' },
              { name: 'Use Voice Activity', value: 'Use Voice Activity' },
              { name: 'Change Nickname', value: 'Change Nickname' },
              { name: 'Manage Nicknames', value: 'Manage Nicknames' },
              { name: 'Manage Threads', value: 'Manage Threads' }
            ))),
  
  cooldown: 5,
  
  /**
   * Executes the permissions command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      
      switch (subcommand) {
        case 'user':
          await this.checkUserPermissions(interaction);
          break;
        case 'role':
          await this.checkRolePermissions(interaction);
          break;
        case 'explain':
          await this.explainPermission(interaction);
          break;
      }
    } catch (error) {
      logger.error(`Error executing permissions command: ${error.message}`);
      await interaction.reply({
        content: 'An error occurred while checking permissions.',
        ephemeral: true
      });
    }
  },
  
  /**
   * Check permissions for a user in a channel
   * @param {Interaction} interaction - The interaction
   */
  async checkUserPermissions(interaction) {
    await interaction.deferReply();
    
    // Get the target user (default to the command user if not specified)
    const targetUser = interaction.options.getUser('target') || interaction.user;
    
    // Get the target channel (default to the current channel if not specified)
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    
    // Get the member object for the target user
    try {
      const targetMember = await interaction.guild.members.fetch(targetUser.id);
      
      // Get the permissions for the target member in the target channel
      const permissions = targetMember.permissionsIn(targetChannel);
      
      // Create an embed to display the permissions
      const embed = new EmbedBuilder()
        .setTitle(`Permissions for ${targetUser.tag}`)
        .setDescription(`Showing permissions in ${targetChannel}`)
        .setColor(config.embedColor || '#3498db')
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp();
      
      // Add a field for the important permissions
      const importantPerms = [
        PermissionFlagsBits.Administrator,
        PermissionFlagsBits.ManageGuild,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageRoles,
        PermissionFlagsBits.KickMembers,
        PermissionFlagsBits.BanMembers,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.MentionEveryone,
        PermissionFlagsBits.ManageWebhooks,
        PermissionFlagsBits.ModerateMembers
      ];
      
      const importantPermsText = importantPerms.map(perm => {
        const permObj = PERMISSION_DESCRIPTIONS.find(p => p.flag === perm);
        const hasPermission = permissions.has(perm);
        return `${hasPermission ? '✅' : '❌'} ${permObj?.name || 'Unknown Permission'}`;
      }).join('\n');
      
      embed.addFields({
        name: 'Important Permissions',
        value: importantPermsText || 'No permissions',
        inline: false
      });
      
      // Group other permissions by category
      const generalPerms = [];
      const textPerms = [];
      const voicePerms = [];
      const threadPerms = [];
      
      for (const perm of PERMISSION_DESCRIPTIONS) {
        // Skip important permissions already shown
        if (importantPerms.includes(perm.flag)) continue;
        
        const hasPermission = permissions.has(perm.flag);
        const permText = `${hasPermission ? '✅' : '❌'} ${perm.name}`;
        
        // Categorize permissions
        if (perm.name.includes('Thread') || perm.name.includes('Private') || perm.name.includes('Public')) {
          threadPerms.push(permText);
        } else if (perm.name.includes('Voice') || perm.name.includes('Speak') || perm.name.includes('Mute') ||
                  perm.name.includes('Deafen') || perm.name.includes('Connect') || perm.name.includes('Stream')) {
          voicePerms.push(permText);
        } else if (perm.name.includes('Message') || perm.name.includes('Reactions') || perm.name.includes('Embed') ||
                  perm.name.includes('Attach') || perm.name.includes('TTS') || perm.name.includes('Mention')) {
          textPerms.push(permText);
        } else {
          generalPerms.push(permText);
        }
      }
      
      // Add fields for categorized permissions
      if (generalPerms.length > 0) {
        embed.addFields({
          name: 'General Permissions',
          value: generalPerms.join('\n'),
          inline: true
        });
      }
      
      if (textPerms.length > 0) {
        embed.addFields({
          name: 'Text Permissions',
          value: textPerms.join('\n'),
          inline: true
        });
      }
      
      // Add a field for the administrator permission if the user has it
      if (permissions.has(PermissionFlagsBits.Administrator)) {
        embed.addFields({
          name: '⚠️ Administrator',
          value: 'This user has the Administrator permission, which grants all permissions and bypasses all channel-specific permission overwrites.',
          inline: false
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
      logger.info(`User ${interaction.user.tag} checked permissions for ${targetUser.tag} in ${targetChannel.name}`);
    } catch (error) {
      logger.error(`Error checking user permissions: ${error.message}`);
      await interaction.editReply('Could not fetch permissions for this user. They may have left the server or the bot lacks access.');
    }
  },
  
  /**
   * Check permissions for a role in a channel
   * @param {Interaction} interaction - The interaction
   */
  async checkRolePermissions(interaction) {
    await interaction.deferReply();
    
    // Get the target role
    const targetRole = interaction.options.getRole('role');
    
    // Get the target channel (default to the current channel if not specified)
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    
    try {
      // Get the permissions for the role in the channel
      const permissions = targetRole.permissions;
      
      // Create an embed to display the permissions
      const embed = new EmbedBuilder()
        .setTitle(`Permissions for Role: ${targetRole.name}`)
        .setDescription(`Showing permissions in ${targetChannel}`)
        .setColor(targetRole.color || config.embedColor || '#3498db')
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp();
      
      // Add fields for categorized permissions
      const permissionsList = [];
      
      for (const perm of PERMISSION_DESCRIPTIONS) {
        const hasPermission = permissions.has(perm.flag);
        permissionsList.push(`${hasPermission ? '✅' : '❌'} ${perm.name}`);
      }
      
      // Split permissions into multiple fields if needed
      const chunkSize = 15;
      for (let i = 0; i < permissionsList.length; i += chunkSize) {
        const chunk = permissionsList.slice(i, i + chunkSize);
        embed.addFields({
          name: `Permissions ${i / chunkSize + 1}`,
          value: chunk.join('\n'),
          inline: true
        });
      }
      
      // Add a field for the administrator permission if the role has it
      if (permissions.has(PermissionFlagsBits.Administrator)) {
        embed.addFields({
          name: '⚠️ Administrator',
          value: 'This role has the Administrator permission, which grants all permissions and bypasses all channel-specific permission overwrites.',
          inline: false
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
      logger.info(`User ${interaction.user.tag} checked permissions for role ${targetRole.name} in ${targetChannel.name}`);
    } catch (error) {
      logger.error(`Error checking role permissions: ${error.message}`);
      await interaction.editReply('Could not fetch permissions for this role. The bot may lack access or the role may have been deleted.');
    }
  },
  
  /**
   * Explain a specific permission
   * @param {Interaction} interaction - The interaction
   */
  async explainPermission(interaction) {
    // Get the target permission
    const permissionName = interaction.options.getString('permission');
    
    // Find the permission in the PERMISSION_DESCRIPTIONS array
    const permission = PERMISSION_DESCRIPTIONS.find(p => p.name === permissionName);
    
    if (!permission) {
      return interaction.reply({
        content: `Could not find permission: ${permissionName}`,
        ephemeral: true
      });
    }
    
    // Create an embed to explain the permission
    const embed = new EmbedBuilder()
      .setTitle(`Permission: ${permission.name}`)
      .setDescription(permission.description)
      .setColor(config.embedColor || '#3498db')
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();
    
    // Add examples of what this permission allows
    let examplesText = 'This permission allows a user to:';
    
    switch (permission.flag) {
      case PermissionFlagsBits.Administrator:
        examplesText += '\n• Use all permissions in the server and bypass any channel permission overwrites'
        examplesText += '\n• Access all channels, regardless of permission overwrites'
        examplesText += '\n• Use all administrative functions even if not explicitly granted'
        examplesText += '\n\n⚠️ **Warning:** This is a powerful permission that should be granted carefully.'
        break;
        
      case PermissionFlagsBits.ManageGuild:
        examplesText += '\n• Edit server settings'
        examplesText += '\n• Manage server integrations'
        examplesText += '\n• View server insights'
        examplesText += '\n• Create and manage server events'
        break;
        
      case PermissionFlagsBits.ManageChannels:
        examplesText += '\n• Create, edit, and delete channels'
        examplesText += '\n• Change channel permissions'
        examplesText += '\n• Change channel topic and slowmode settings'
        break;
        
      case PermissionFlagsBits.ManageRoles:
        examplesText += '\n• Create, edit, and delete roles (below their highest role)'
        examplesText += '\n• Assign and remove roles from members (below their highest role)'
        examplesText += '\n• Manage channel permission overwrites'
        break;
        
      case PermissionFlagsBits.KickMembers:
        examplesText += '\n• Remove members from the server (they can rejoin with an invite)'
        break;
        
      case PermissionFlagsBits.BanMembers:
        examplesText += '\n• Remove members from the server and prevent them from rejoining'
        examplesText += '\n• View and manage the server ban list'
        break;
      
      case PermissionFlagsBits.ManageMessages:
        examplesText += '\n• Delete messages from other users'
        examplesText += '\n• Pin and unpin messages'
        examplesText += '\n• Manage threads'
        break;
        
      default:
        examplesText += '\n• ' + permission.description;
    }
    
    embed.addFields({ name: 'Examples', value: examplesText });
    
    await interaction.reply({ embeds: [embed] });
    
    logger.info(`User ${interaction.user.tag} got explanation for permission: ${permissionName}`);
  }
};