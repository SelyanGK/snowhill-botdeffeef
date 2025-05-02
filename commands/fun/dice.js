const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Roll one or more dice with custom sides')
    .addIntegerOption(option =>
      option.setName('sides')
        .setDescription('Number of sides on each die (default: 6)')
        .setRequired(false)
        .setMinValue(2)
        .setMaxValue(100))
    .addIntegerOption(option =>
      option.setName('count')
        .setDescription('Number of dice to roll (default: 1)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)),
  
  cooldown: 3,
  
  /**
   * Executes the dice command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Get the number of sides (default: 6) and count (default: 1)
      const sides = interaction.options.getInteger('sides') || 6;
      const count = interaction.options.getInteger('count') || 1;
      
      // Roll the dice
      const rolls = [];
      let total = 0;
      for (let i = 0; i < count; i++) {
        const roll = Math.floor(Math.random() * sides) + 1;
        rolls.push(roll);
        total += roll;
      }
      
      // Create the embed with the dice rolls
      const embed = new EmbedBuilder()
        .setTitle('🎲 Dice Roll Result')
        .setColor(config.embedColor);
      
      // Different messages based on number of dice
      if (count === 1) {
        embed.setDescription(`You rolled a **${rolls[0]}** on a **${sides}-sided** die.`);
      } else {
        // Format each roll
        const rollDetails = rolls.map((roll, index) => `Die ${index + 1}: **${roll}**`).join('\n');
        
        embed.setDescription(`You rolled **${count}** dice with **${sides}** sides each.`)
             .addFields(
               { name: 'Rolls', value: rollDetails, inline: true },
               { name: 'Total', value: `**${total}**`, inline: true }
             );
      }
      
      // Add some flavor based on the roll for a single die
      if (count === 1) {
        if (rolls[0] === 1) {
          embed.setFooter({ text: 'Critical failure! Better luck next time!' });
        } else if (rolls[0] === sides) {
          embed.setFooter({ text: 'Critical success! Well done!' });
        } else if (rolls[0] <= Math.floor(sides / 4)) {
          embed.setFooter({ text: 'Not very impressive...' });
        } else if (rolls[0] >= Math.ceil(sides * 3 / 4)) {
          embed.setFooter({ text: 'That\'s a great roll!' });
        }
      } else {
        // For multiple dice, add statistics
        const average = total / count;
        const min = Math.min(...rolls);
        const max = Math.max(...rolls);
        
        embed.addFields({
          name: 'Statistics',
          value: `Min: **${min}** | Max: **${max}** | Avg: **${average.toFixed(2)}**`
        });
      }
      
      // Send the embed
      await interaction.editReply({ embeds: [embed] });
      logger.info(`User ${interaction.user.tag} rolled ${count}d${sides} and got ${total}`);
    } catch (error) {
      logger.error(`Error executing dice command: ${error.message}`);
      await interaction.editReply('An error occurred while rolling the dice.');
    }
  }
};
