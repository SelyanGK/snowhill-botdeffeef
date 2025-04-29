const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays all available commands')
    .addStringOption(option => 
      option
        .setName('category')
        .setDescription('The command category to show')
        .setRequired(false)
        .addChoices(
          { name: 'Fun', value: 'fun' },
          { name: 'Giveaway', value: 'giveaway' },
          { name: 'Moderation', value: 'moderation' },
          { name: 'Sticky', value: 'sticky' },
          { name: 'Utility', value: 'utility' }
        )),

  cooldown: 5,

  /**
   * Executes the help command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const selectedCategory = interaction.options.getString('category');
    
    try {
      if (selectedCategory) {
        // Show commands for specific category
        await showCategoryCommands(interaction, selectedCategory);
      } else {
        // Show overview of all categories
        await showAllCategories(interaction);
      }
    } catch (error) {
      logger.error(`Error in help command: ${error.message}`);
      await interaction.reply({ 
        content: 'An error occurred while getting command help.', 
        ephemeral: true 
      });
    }
  },
};

/**
 * Shows all command categories
 * @param {Interaction} interaction - The interaction
 */
async function showAllCategories(interaction) {
  const embed = new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(`${config.serverName} Bot Commands`)
    .setDescription('Here are all available command categories. Use `/help category:name` to see specific commands.')
    .addFields(
      { name: '🎮 Fun', value: 'Fun commands like 8ball, coinflip, and jokes', inline: true },
      { name: '🎁 Giveaway', value: 'Create and manage server giveaways', inline: true },
      { name: '🛡️ Moderation', value: 'Commands for server moderation', inline: true },
      { name: '📌 Sticky', value: 'Set and remove sticky messages', inline: true },
      { name: '🔧 Utility', value: 'Utility commands like ping and serverinfo', inline: true }
    )
    .setFooter({ text: `Use /help category:name for details on specific commands` })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

/**
 * Shows commands for a specific category
 * @param {Interaction} interaction - The interaction
 * @param {string} category - The command category
 */
async function showCategoryCommands(interaction, category) {
  const commandsPath = path.join(__dirname, '..', category);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  const embed = new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(`${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
    .setDescription(`Here are all commands in the ${category} category:`)
    .setFooter({ text: `Use /command for more information on each command` })
    .setTimestamp();
  
  // Add command info
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if (!command.data) continue;
    
    const name = command.data.name;
    const description = command.data.description;
    
    // Special handling for antiping command to show all its subcommands
    if (name === 'antiping' && category === 'moderation') {
      embed.addFields({ 
        name: `/${name}`, 
        value: "Anti-ping protection system with the following subcommands:"
      });
      
      embed.addFields({ 
        name: "Configure Protection",
        value: 
          "/antiping view - View current configuration\n" +
          "/antiping enable - Enable the anti-ping system\n" +
          "/antiping disable - Disable the anti-ping system\n" +
          "/antiping addprotectedrole - Set a role that cannot be pinged\n" +
          "/antiping addbypassrole - Set a role that can ping protected roles\n" +
          "/antiping muteduration - Set the timeout duration for violations\n" +
          "/antiping message - Set the warning message\n" +
          "/antiping log - Set the log channel"
      });
    } else {
      embed.addFields({ name: `/${name}`, value: description || 'No description available' });
    }
  }
  
  await interaction.reply({ embeds: [embed] });
}