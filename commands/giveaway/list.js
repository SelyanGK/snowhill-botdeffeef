const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config.json');
const Database = require('../../utils/database');

// Giveaway database
const giveawayDb = new Database('giveaways.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('glist')
    .setDescription('List all active giveaways')
    .addBooleanOption(option => 
      option.setName('include_ended')
        .setDescription('Include ended giveaways')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),
  
  cooldown: 5,
  
  /**
   * Executes the giveaway list command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const includeEnded = interaction.options.getBoolean('include_ended') || false;
    
    // Get giveaways
    const giveaways = giveawayDb.read();
    
    // Filter giveaways
    const filteredGiveaways = includeEnded 
      ? giveaways 
      : giveaways.filter(g => !g.ended);
    
    // Sort by end time
    filteredGiveaways.sort((a, b) => a.endTime - b.endTime);
    
    // Defer reply
    await interaction.deferReply({ ephemeral: true });
    
    if (filteredGiveaways.length === 0) {
      return interaction.editReply({
        embeds: [{
          title: '📋 Giveaways List',
          description: includeEnded 
            ? 'There are no giveaways on this server.' 
            : 'There are no active giveaways on this server.',
          color: parseInt(config.embedColor.replace('#', ''), 16),
          timestamp: new Date().toISOString()
        }]
      });
    }
    
    try {
      // Create giveaway list
      const giveawayList = filteredGiveaways.map(g => {
        const endText = g.ended 
          ? `Ended <t:${Math.floor(g.endedAt / 1000)}:R>`
          : `Ends <t:${Math.floor(g.endTime / 1000)}:R>`;
        
        const winnerText = g.ended && g.winners 
          ? `Winners: ${g.winners.length}`
          : `Winner Count: ${g.winnerCount}`;
        
        return `**${g.prize}** (ID: \`${g.id}\`)\n${endText} • ${winnerText} • Entries: ${g.participants.length}\n`;
      }).join('\n');
      
      // Send the list
      await interaction.editReply({
        embeds: [{
          title: '📋 Giveaways List',
          description: giveawayList,
          color: parseInt(config.embedColor.replace('#', ''), 16),
          footer: {
            text: `Total: ${filteredGiveaways.length} giveaway(s) • Use /gend <id> to end a giveaway early`
          },
          timestamp: new Date().toISOString()
        }]
      });
    } catch (error) {
      logger.error(`Error listing giveaways: ${error.message}`);
      
      await interaction.editReply({
        embeds: [{
          title: '❌ Failed to List Giveaways',
          description: `An error occurred: ${error.message}`,
          color: parseInt(config.errorColor.replace('#', ''), 16),
          timestamp: new Date().toISOString()
        }]
      });
    }
  },
};
