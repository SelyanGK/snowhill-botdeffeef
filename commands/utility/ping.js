const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Checks bot latency and API response time'),
  
  cooldown: 5,
  
  /**
   * Executes the ping command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    // Defer reply to calculate round-trip latency
    const sent = await interaction.deferReply({ fetchReply: true });
    
    // Calculate roundtrip latency
    const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
    
    // Get websocket heartbeat
    const websocketLatency = interaction.client.ws.ping;
    
    // Determine emoji based on latency
    let emoji = '🟢'; // Green for good ping
    if (websocketLatency > 200 || roundtripLatency > 500) {
      emoji = '🟡'; // Yellow for moderate ping
    }
    if (websocketLatency > 400 || roundtripLatency > 1000) {
      emoji = '🔴'; // Red for poor ping
    }
    
    // Send ping info
    await interaction.editReply({
      embeds: [{
        title: `${emoji} Pong!`,
        fields: [
          { name: 'Bot Latency', value: `${roundtripLatency}ms`, inline: true },
          { name: 'API Latency', value: `${websocketLatency}ms`, inline: true }
        ],
        color: parseInt(config.embedColor.replace('#', ''), 16),
        footer: {
          text: `Requested by ${interaction.user.tag}`,
          icon_url: interaction.user.displayAvatarURL({ dynamic: true })
        },
        timestamp: new Date().toISOString()
      }]
    });
  },
};
