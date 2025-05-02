const { SlashCommandBuilder, EmbedBuilder, version: discordJsVersion } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');
const os = require('os');
const process = require('process');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Shows statistics about the bot'),
  
  cooldown: 10,
  
  /**
   * Executes the stats command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const client = interaction.client;
      
      // Get bot statistics
      const uptime = this.formatUptime(client.uptime);
      const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2); // MB
      const botPing = Math.round(client.ws.ping);
      
      // Count commands, servers, and users
      const totalCommands = client.commands.size;
      const totalGuilds = client.guilds.cache.size;
      const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
      
      // Get information about the host system
      const osType = os.type();
      const osVersion = os.release();
      const nodeVersion = process.version;
      
      // Create the embed
      const embed = new EmbedBuilder()
        .setTitle('Bot Statistics')
        .setColor(config.embedColor)
        .addFields(
          { name: 'Bot Information', value: 
            `**Uptime:** ${uptime}\n` +
            `**Memory Usage:** ${memoryUsage} MB\n` +
            `**Ping:** ${botPing}ms\n` +
            `**Commands:** ${totalCommands}\n` +
            `**Servers:** ${totalGuilds}\n` +
            `**Users:** ${totalMembers.toLocaleString()}\n` 
          },
          { name: 'System Information', value: 
            `**OS:** ${osType} ${osVersion}\n` +
            `**Node.js:** ${nodeVersion}\n` +
            `**Discord.js:** v${discordJsVersion}\n` +
            `**CPU Cores:** ${os.cpus().length}\n` +
            `**CPU Model:** ${os.cpus()[0].model}`
          }
        )
        .setFooter({ text: `Requested by ${interaction.user.tag} | Bot ID: ${client.user.id}` })
        .setTimestamp();
      
      // Set the bot avatar as thumbnail if available
      if (client.user.avatarURL()) {
        embed.setThumbnail(client.user.avatarURL({ dynamic: true }));
      }
      
      await interaction.editReply({ embeds: [embed] });
      logger.info(`User ${interaction.user.tag} checked bot statistics`);
    } catch (error) {
      logger.error(`Error executing stats command: ${error.message}`);
      await interaction.editReply('An error occurred while fetching bot statistics.');
    }
  },
  
  /**
   * Formats uptime in a readable format
   * @param {number} ms - Uptime in milliseconds
   * @returns {string} - Formatted uptime string
   */
  formatUptime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    
    const parts = [];
    if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`);
    if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
    if (seconds > 0) parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`);
    
    return parts.join(', ');
  }
};
