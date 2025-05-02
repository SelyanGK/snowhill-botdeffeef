const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('random')
    .setDescription('Generate random numbers')
    .addSubcommand(subcommand =>
      subcommand
        .setName('number')
        .setDescription('Generate a random number within a range')
        .addIntegerOption(option =>
          option.setName('min')
            .setDescription('Minimum value (inclusive)')
            .setRequired(false))
        .addIntegerOption(option =>
          option.setName('max')
            .setDescription('Maximum value (inclusive)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('pick')
        .setDescription('Pick a random item from a list')
        .addStringOption(option =>
          option.setName('items')
            .setDescription('Items to choose from, separated by commas')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('coinflip')
        .setDescription('Flip a coin')
        .addIntegerOption(option =>
          option.setName('times')
            .setDescription('Number of times to flip (1-10)')
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(false))),
  
  cooldown: 3,
  
  /**
   * Executes the random command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      
      switch (subcommand) {
        case 'number':
          await this.generateRandomNumber(interaction);
          break;
        case 'pick':
          await this.pickRandomItem(interaction);
          break;
        case 'coinflip':
          await this.flipCoin(interaction);
          break;
      }
    } catch (error) {
      logger.error(`Error executing random command: ${error.message}`);
      await interaction.reply({
        content: 'An error occurred while generating random results.',
        ephemeral: true
      });
    }
  },
  
  /**
   * Generate a random number within a range
   * @param {Interaction} interaction - The interaction
   */
  async generateRandomNumber(interaction) {
    // Get the minimum and maximum values (defaults: 1-100)
    const min = interaction.options.getInteger('min') ?? 1;
    const max = interaction.options.getInteger('max') ?? 100;
    
    // Validate the range
    if (min >= max) {
      return interaction.reply({
        content: 'The minimum value must be less than the maximum value.',
        ephemeral: true
      });
    }
    
    // Generate a random number within the range (inclusive)
    const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
    
    // Create an embed to display the result
    const embed = new EmbedBuilder()
      .setTitle('🎲 Random Number Generator')
      .setDescription(`I generated a random number between **${min}** and **${max}**:`)
      .addFields({
        name: 'Result',
        value: `**${randomNumber}**`,
        inline: false
      })
      .setColor(config.embedColor || '#3498db')
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    
    logger.info(`User ${interaction.user.tag} generated a random number between ${min} and ${max}: ${randomNumber}`);
  },
  
  /**
   * Pick a random item from a list
   * @param {Interaction} interaction - The interaction
   */
  async pickRandomItem(interaction) {
    // Get the items
    const itemsString = interaction.options.getString('items');
    
    // Split the items by commas and trim whitespace
    const items = itemsString.split(',').map(item => item.trim()).filter(item => item.length > 0);
    
    // Validate the items
    if (items.length === 0) {
      return interaction.reply({
        content: 'Please provide at least one item to choose from.',
        ephemeral: true
      });
    }
    
    // Pick a random item
    const randomIndex = Math.floor(Math.random() * items.length);
    const randomItem = items[randomIndex];
    
    // Create an embed to display the result
    const embed = new EmbedBuilder()
      .setTitle('🎰 Random Item Picker')
      .setDescription(`I randomly picked an item from your list of ${items.length} items:`)
      .addFields({
        name: 'Selected Item',
        value: `**${randomItem}**`,
        inline: false
      })
      .setColor(config.embedColor || '#3498db')
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();
    
    // Add all items field if there are fewer than 20 items
    if (items.length < 20) {
      embed.addFields({
        name: 'All Items',
        value: items.map((item, index) => `${index === randomIndex ? '⭐' : '▪'} ${item}`).join('\n'),
        inline: false
      });
    }
    
    await interaction.reply({ embeds: [embed] });
    
    logger.info(`User ${interaction.user.tag} picked a random item from a list: ${randomItem}`);
  },
  
  /**
   * Flip a coin
   * @param {Interaction} interaction - The interaction
   */
  async flipCoin(interaction) {
    // Get the number of times to flip
    const times = interaction.options.getInteger('times') || 1;
    
    // Flip the coin
    const results = [];
    let heads = 0;
    let tails = 0;
    
    for (let i = 0; i < times; i++) {
      const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
      results.push(result);
      
      if (result === 'Heads') heads++;
      else tails++;
    }
    
    // Create an embed to display the results
    const embed = new EmbedBuilder()
      .setTitle('💰 Coin Flip')
      .setDescription(`I flipped a coin ${times} time${times !== 1 ? 's' : ''}:`)
      .setColor(config.embedColor || '#3498db')
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();
    
    if (times === 1) {
      // Single flip
      embed.addFields({
        name: 'Result',
        value: `**${results[0]}** ${results[0] === 'Heads' ? '👸' : '👹'}`,
        inline: false
      });
    } else {
      // Multiple flips
      embed.addFields(
        {
          name: 'Results',
          value: results.map((result, i) => `Flip ${i + 1}: **${result}** ${result === 'Heads' ? '👸' : '👹'}`).join('\n'),
          inline: false
        },
        {
          name: 'Summary',
          value: `**Heads:** ${heads} (${Math.round(heads / times * 100)}%)\n**Tails:** ${tails} (${Math.round(tails / times * 100)}%)`,
          inline: false
        }
      );
    }
    
    await interaction.reply({ embeds: [embed] });
    
    logger.info(`User ${interaction.user.tag} flipped a coin ${times} time(s)`);
  }
};