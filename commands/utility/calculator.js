const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('calculator')
    .setDescription('Perform a mathematical calculation')
    .addStringOption(option =>
      option.setName('expression')
        .setDescription('The mathematical expression to evaluate')
        .setRequired(true)),
  
  cooldown: 3,
  
  /**
   * Executes the calculator command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Get the expression to evaluate
      const expression = interaction.options.getString('expression').trim();
      
      // Validate the expression to prevent eval() security issues
      const isValid = this.validateExpression(expression);
      
      if (!isValid) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Invalid Expression')
              .setDescription('Only basic mathematical expressions are allowed.')
              .setColor(config.errorColor || 0xff0000)
              .addFields({ name: 'Allowed', value: 'Numbers, decimal points, parentheses, and operators (+, -, *, /, %, ^, **)' })
              .setFooter({ text: 'For security reasons, other functions and code are not supported' })
          ]
        });
      }
      
      // Replace ^ with ** for exponentiation
      const formattedExpression = expression.replace(/\^/g, '**');
      
      // Safely evaluate the expression
      const result = this.evaluateExpression(formattedExpression);
      
      if (result === null) {
        return interaction.editReply('Error evaluating the expression. Please check your syntax.');
      }
      
      // Format result with commas for larger numbers
      const formattedResult = typeof result === 'number' ? 
        (Number.isInteger(result) ? 
          result.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : 
          result.toPrecision(10).replace(/\.?0+$/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")
        ) : 
        result;
      
      // Create the embed
      const embed = new EmbedBuilder()
        .setTitle('Calculator')
        .setColor(config.embedColor)
        .addFields(
          { name: 'Expression', value: `\`${expression}\``, inline: false },
          { name: 'Result', value: `\`${formattedResult}\``, inline: false }
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      logger.info(`User ${interaction.user.tag} calculated ${expression} = ${result}`);
    } catch (error) {
      logger.error(`Error executing calculator command: ${error.message}`);
      await interaction.editReply('An error occurred while calculating. Please check your expression and try again.');
    }
  },
  
  /**
   * Validates a mathematical expression for security
   * @param {string} expression - The expression to validate
   * @returns {boolean} Whether the expression is valid
   */
  validateExpression(expression) {
    // Only allow numbers, basic operators, and parentheses
    return /^[\d\s\(\)\+\-\*\/\^\%\.]+$/.test(expression);
  },
  
  /**
   * Safely evaluates a mathematical expression
   * @param {string} expression - The expression to evaluate
   * @returns {number|null} The result or null if the expression is invalid
   */
  evaluateExpression(expression) {
    try {
      // Create a safe context for evaluation
      const safeEval = Function('return ' + expression);
      return safeEval();
    } catch (error) {
      logger.warn(`Calculator error: ${error.message} for expression: ${expression}`);
      return null;
    }
  }
};
