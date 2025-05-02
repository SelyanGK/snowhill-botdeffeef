const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

// Staff role IDs as specified
const STAFF_ROLE_IDS = [
  '1321564484057169990', '1321891860058472529', '1361268609103695872', 
  '1343803443210616883', '1340719525024239739', '1325201794967797871', 
  '1334084405710557234', '1321882277017555034', '1334084595552878603', 
  '1360437911899865170', '1353760281146425374', '1355507298318942420', 
  '1352698890691809383', '1360441480447131811', '1356700688591093780', 
  '1321840218558566460', '1325829908676476938'
];

// Store the last used time for the command (per user)
const userCooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff')
    .setDescription('Displays a list of all staff members sorted by hierarchy'),
  
  // 5 minute cooldown (bypassed for administrators)
  cooldown: 300,
  
  /**
   * Executes the staff command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Check if user has admin permission (to bypass cooldown)
      const hasAdminPermission = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
      
      // Check cooldown if user doesn't have admin permissions
      if (!hasAdminPermission) {
        const currentTime = Date.now();
        const userId = interaction.user.id;
        const cooldownTime = userCooldowns.get(userId);
        
        // If the user has used this command before and the cooldown hasn't expired
        if (cooldownTime && currentTime < cooldownTime + (this.cooldown * 1000)) {
          const timeLeft = Math.ceil((cooldownTime + (this.cooldown * 1000) - currentTime) / 1000);
          return interaction.editReply({
            content: `Please wait ${timeLeft} seconds before using this command again.`,
            ephemeral: true
          });
        }
        
        // Set the cooldown for this user
        userCooldowns.set(userId, currentTime);
        
        // Clean up old cooldowns periodically
        if (userCooldowns.size > 100) {
          // Keep only the 50 most recent cooldowns
          const sortedEntries = [...userCooldowns.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 50);
          
          userCooldowns.clear();
          sortedEntries.forEach(([id, time]) => userCooldowns.set(id, time));
        }
      }
      
      // Get the guild
      const guild = interaction.guild;
      
      // Fetch all guild roles to determine hierarchy
      const guildRoles = [...guild.roles.cache.values()]
        .sort((a, b) => b.position - a.position); // Sort by position (highest first)
      
      // Filter to only include staff roles
      const staffRoles = guildRoles.filter(role => STAFF_ROLE_IDS.includes(role.id));
      
      // Map of role ID to its position for sorting later
      const rolePositions = {};
      staffRoles.forEach(role => {
        rolePositions[role.id] = role.position;
      });
      
      // Fetch all members who have at least one of the staff roles
      await guild.members.fetch();
      
      // Get staff members
      const staffMembers = guild.members.cache.filter(member => {
        return member.roles.cache.some(role => STAFF_ROLE_IDS.includes(role.id));
      });
      
      if (staffMembers.size === 0) {
        return interaction.editReply('No staff members were found.');
      }
      
      // Group staff members by their highest role
      const staffByHighestRole = new Map();
      
      staffMembers.forEach(member => {
        // Find the highest staff role this member has
        const memberStaffRoles = member.roles.cache.filter(role => STAFF_ROLE_IDS.includes(role.id));
        
        if (memberStaffRoles.size === 0) return;
        
        // Get the highest position role
        const highestRole = memberStaffRoles.sort((a, b) => b.position - a.position).first();
        
        if (!staffByHighestRole.has(highestRole.id)) {
          staffByHighestRole.set(highestRole.id, []);
        }
        
        staffByHighestRole.get(highestRole.id).push(member);
      });
      
      // Create a formatted staff list in hierarchy order
      let staffList = "";
      
      // Process each role in order of hierarchy
      for (const role of staffRoles) {
        const membersWithRole = staffByHighestRole.get(role.id);
        if (!membersWithRole || membersWithRole.length === 0) continue;
        
        // Sort members alphabetically within each role
        membersWithRole.sort((a, b) => a.displayName.localeCompare(b.displayName));
        
        // Add the role as a header
        staffList += `**${role.name}** (${membersWithRole.length})\n`;
        
        // Add each member with mention that doesn't ping
        membersWithRole.forEach(member => {
          staffList += `• ${member.displayName} (<@${member.id}>)\n`;
        });
        
        staffList += "\n"; // Add extra spacing between roles
      }
      
      // Create an embed with the staff list
      const staffEmbed = new EmbedBuilder()
        .setTitle('Server Staff Members')
        .setDescription(staffList.trim() || 'No staff members found.')
        .setColor(config.embedColor)
        .setFooter({ text: `Total Staff: ${staffMembers.size} | Server: ${guild.name}` })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [staffEmbed] });
      
      logger.info(`User ${interaction.user.tag} (${interaction.user.id}) requested the staff list`);
    } catch (error) {
      logger.error(`Error executing staff command: ${error.message}`);
      
      await interaction.editReply({
        content: 'An error occurred while trying to fetch the staff list. Please try again later.',
        embeds: []
      }).catch(() => {});
    }
  }
};
