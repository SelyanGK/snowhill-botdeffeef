const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Get information about a role')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The role to get information about')
        .setRequired(true)),
  
  cooldown: 5,
  
  /**
   * Executes the roleinfo command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const role = interaction.options.getRole('role');
      
      // Get role creation date
      const createdAt = Math.floor(role.createdTimestamp / 1000);
      
      // Get role permissions
      const permissions = role.permissions.toArray();
      
      // Format permissions for display
      const formattedPermissions = permissions.length > 0
        ? permissions.map(perm => formatPermission(perm)).join('\n')
        : 'No permissions';
      
      // Limit permissions display to avoid hitting character limits
      const limitedPermissions = formattedPermissions.length > 1024
        ? formattedPermissions.substring(0, 1020) + '...'
        : formattedPermissions;
      
      // Count members with this role
      const membersWithRole = interaction.guild.members.cache.filter(member => 
        member.roles.cache.has(role.id)
      ).size;
      
      // Create the embed
      const embed = new EmbedBuilder()
        .setTitle(`Role Information: ${role.name}`)
        .setColor(role.color || config.embedColor)
        .addFields(
          { name: 'ID', value: role.id, inline: true },
          { name: 'Color', value: role.hexColor.toUpperCase(), inline: true },
          { name: 'Position', value: `${role.position}`, inline: true },
          { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
          { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
          { name: 'Managed', value: role.managed ? 'Yes' : 'No', inline: true },
          { name: 'Created', value: `<t:${createdAt}:F> (<t:${createdAt}:R>)`, inline: false },
          { name: `Members [${membersWithRole}]`, value: membersWithRole > 0 ? `${membersWithRole} members have this role` : 'No members have this role', inline: false },
          { name: 'Key Permissions', value: limitedPermissions, inline: false }
        );
      
      // If the role has an icon, add it to the embed
      if (role.icon) {
        embed.setThumbnail(role.iconURL({ dynamic: true }));
      }
      
      await interaction.editReply({ embeds: [embed] });
      logger.info(`User ${interaction.user.tag} requested info for role ${role.name} (${role.id})`);
    } catch (error) {
      logger.error(`Error executing roleinfo command: ${error.message}`);
      await interaction.editReply('An error occurred while fetching role information. Please try again.');
    }
  }
};

/**
 * Formats a permission flag into a human-readable string
 * @param {string} permission - The permission flag
 * @returns {string} Formatted permission name
 */
function formatPermission(permission) {
  // Convert SCREAMING_SNAKE_CASE to Title Case With Spaces
  const formatted = permission.toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
  
  // Add emoji based on permission type
  const category = getPermissionCategory(permission);
  let emoji = '\u2705'; // Default: checkmark
  
  switch (category) {
    case 'general':
      emoji = '\ud83d\udd11'; // Key emoji
      break;
    case 'text':
      emoji = '\ud83d\udcac'; // Speech bubble emoji
      break;
    case 'voice':
      emoji = '\ud83c\udfa4'; // Microphone emoji
      break;
    case 'management':
      emoji = '\ud83d\udd28'; // Hammer emoji
      break;
    case 'dangerous':
      emoji = '\u26a0\ufe0f'; // Warning emoji
      break;
  }
  
  return `${emoji} ${formatted}`;
}

/**
 * Determines the category of a permission for display purposes
 * @param {string} permission - The permission flag
 * @returns {string} Category name
 */
function getPermissionCategory(permission) {
  const dangerous = [
    'ADMINISTRATOR', 'BAN_MEMBERS', 'KICK_MEMBERS', 'MANAGE_GUILD', 
    'MANAGE_ROLES', 'MANAGE_WEBHOOKS', 'MANAGE_CHANNELS', 'MANAGE_NICKNAMES',
    'MANAGE_MESSAGES', 'MENTION_EVERYONE'
  ];
  
  const management = [
    'MANAGE_THREADS', 'MANAGE_EMOJIS_AND_STICKERS', 'MODERATE_MEMBERS',
    'VIEW_AUDIT_LOG', 'VIEW_GUILD_INSIGHTS'
  ];
  
  const text = [
    'SEND_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'READ_MESSAGE_HISTORY',
    'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'CREATE_PUBLIC_THREADS',
    'CREATE_PRIVATE_THREADS', 'SEND_MESSAGES_IN_THREADS', 'USE_EXTERNAL_STICKERS',
    'SEND_TTS_MESSAGES'
  ];
  
  const voice = [
    'CONNECT', 'SPEAK', 'STREAM', 'USE_VAD', 'PRIORITY_SPEAKER',
    'MUTE_MEMBERS', 'DEAFEN_MEMBERS', 'MOVE_MEMBERS', 'REQUEST_TO_SPEAK'
  ];
  
  if (dangerous.includes(permission)) return 'dangerous';
  if (management.includes(permission)) return 'management';
  if (text.includes(permission)) return 'text';
  if (voice.includes(permission)) return 'voice';
  return 'general';
}
