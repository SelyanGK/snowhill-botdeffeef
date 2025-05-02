const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check Discord service status'),
  
  cooldown: 30, // High cooldown to prevent API abuse
  
  /**
   * Executes the status command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Fetch the Discord status from the status page API
      const response = await fetch('https://discordstatus.com/api/v2/summary.json');
      const statusData = await response.json();
      
      if (!response.ok || !statusData) {
        return interaction.editReply('Could not fetch Discord status information.');
      }
      
      // Get the overall status
      const overallStatus = statusData.status.description;
      const indicators = {
        none: '🟢 Operational',
        minor: '🟡 Partial Outage',
        major: '🔴 Major Outage',
        critical: '⚫ Critical Outage',
        maintenance: '🔧 Maintenance'
      };
      
      const overallIndicator = indicators[statusData.status.indicator] || '⚪ Unknown';
      
      // Get the components (services)
      const components = statusData.components.filter(component => component.name !== 'Discord');
      
      // Create the embed
      const embed = new EmbedBuilder()
        .setTitle('Discord Service Status')
        .setURL('https://discordstatus.com')
        .setDescription(`**Overall Status: ${overallIndicator}**\n${overallStatus}`)
        .setColor(this.getStatusColor(statusData.status.indicator))
        .setTimestamp()
        .setFooter({ text: 'Data from Discord Status Page' });
      
      // Add fields for each component
      const componentFields = components.map(component => ({
        name: component.name,
        value: `${indicators[component.status] || '⚪ Unknown'}`,
        inline: true
      }));
      
      embed.addFields(componentFields);
      
      // Add incidents if there are any ongoing
      const incidents = statusData.incidents || [];
      if (incidents.length > 0) {
        const latestIncident = incidents[0];
        const incidentTime = new Date(latestIncident.created_at);
        const timestamp = Math.floor(incidentTime.getTime() / 1000);
        
        const incidentUpdates = latestIncident.incident_updates || [];
        const latestUpdate = incidentUpdates.length > 0 ? incidentUpdates[0].body : 'No updates provided.';
        
        embed.addFields({
          name: `🚨 Active Incident: ${latestIncident.name}`,
          value: `${latestUpdate}\n\nStarted: <t:${timestamp}:R>`
        });
      }
      
      // Add scheduled maintenances if there are any
      const maintenances = statusData.scheduled_maintenances || [];
      if (maintenances.length > 0) {
        const latestMaintenance = maintenances[0];
        const maintenanceTime = new Date(latestMaintenance.scheduled_for);
        const timestamp = Math.floor(maintenanceTime.getTime() / 1000);
        
        embed.addFields({
          name: `🔧 Scheduled Maintenance: ${latestMaintenance.name}`,
          value: `${latestMaintenance.incident_updates[0]?.body || 'No details provided.'}\n\nScheduled for: <t:${timestamp}:f>`
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
      logger.info(`User ${interaction.user.tag} checked Discord service status`);
    } catch (error) {
      logger.error(`Error fetching Discord status: ${error.message}`);
      await interaction.editReply('An error occurred while fetching Discord service status information.');
    }
  },
  
  /**
   * Get the appropriate color based on status indicator
   * @param {string} indicator - The status indicator
   * @returns {number} - The color as an integer
   */
  getStatusColor(indicator) {
    switch (indicator) {
      case 'none': return 0x57F287; // Green
      case 'minor': return 0xFEE75C; // Yellow
      case 'major': return 0xED4245; // Red
      case 'critical': return 0x23272A; // Black
      case 'maintenance': return 0x5865F2; // Blurple
      default: return config.embedColor || 0x3498db; // Default
    }
  }
};