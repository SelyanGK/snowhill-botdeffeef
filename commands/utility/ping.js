const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config.json');
const EmbedCreator = require('../../utils/embedCreator');

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
    
    // Determine emoji and color based on latency
    let emoji = '🟢'; // Green for good ping
    let color = config.successColor;
    
    if (websocketLatency > 200 || roundtripLatency > 500) {
      emoji = '🟡'; // Yellow for moderate ping
      color = config.warningColor;
    }
    
    if (websocketLatency > 400 || roundtripLatency > 1000) {
      emoji = '🔴'; // Red for poor ping
      color = config.errorColor;
    }
    
    // Create ping embed using our utility
    const pingEmbed = EmbedCreator.create({
      title: `${emoji} Pong!`,
      color: color,
      fields: [
        { name: 'Bot Latency', value: `${roundtripLatency}ms`, inline: true },
        { name: 'API Latency', value: `${websocketLatency}ms`, inline: true }
      ],
      footer: `Requested by ${interaction.user.tag}`
    });
    
    // Send ping info
    await interaction.editReply({ embeds: [pingEmbed] });
  },
};
