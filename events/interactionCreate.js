const { Collection, InteractionType } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../config.json');

module.exports = {
  name: 'interactionCreate',
  /**
   * Handles interaction events (commands, buttons, selects, etc.)
   * @param {Interaction} interaction - The interaction
   * @param {Client} client - The Discord client
   */
  async execute(interaction, client) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      
      if (!command) {
        logger.warn(`No command matching ${interaction.commandName} was found.`);
        return;
      }
      
      // Handle command cooldowns
      const { cooldowns } = client;
      
      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
      }
      
      const now = Date.now();
      const timestamps = cooldowns.get(command.data.name);
      const cooldownAmount = (command.cooldown ?? config.defaultCooldown) * 1000;
      
      // Check if user is on cooldown
      if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
        
        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          return interaction.reply({
            content: `Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.data.name}\` command.`,
            ephemeral: true
          });
        }
      }
      
      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
      
      // Execute command
      try {
        // Log more details for subcommands
        if (interaction.options && interaction.options.getSubcommand(false)) {
          const subcommandName = interaction.options.getSubcommand(false);
          logger.info(`User ${interaction.user.tag} (${interaction.user.id}) used command /${interaction.commandName} ${subcommandName}`);
        } else {
          logger.info(`User ${interaction.user.tag} (${interaction.user.id}) used command /${interaction.commandName}`);
        }
        
        await command.execute(interaction, client);
      } catch (error) {
        logger.error(`Error executing command ${interaction.commandName}: ${error.message}`);
        
        const errorResponse = {
          content: 'There was an error while executing this command!',
          ephemeral: true
        };
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorResponse);
        } else {
          await interaction.reply(errorResponse);
        }
      }
    }
    // Handle button interactions
    else if (interaction.isButton()) {
      // Button ID format: type:action:params
      const [type, action, ...params] = interaction.customId.split(':');
      
      logger.info(`Button interaction: ${interaction.customId} by ${interaction.user.tag}`);
      
      try {
        // Handle giveaway buttons
        if (type === 'giveaway') {
          if (action === 'join') {
            // Load the giveaway module dynamically
            const giveawayCreate = require('../commands/giveaway/create');
            await giveawayCreate.handleGiveawayJoin(interaction, client, params[0]);
          } else if (action === 'reroll') {
            const giveawayReroll = require('../commands/giveaway/reroll');
            await giveawayReroll.handleReroll(interaction, client, params[0]);
          } else if (action === 'end') {
            const giveawayEnd = require('../commands/giveaway/end');
            await giveawayEnd.handleEndEarly(interaction, client, params[0]);
          }
        }
      } catch (error) {
        logger.error(`Error handling button interaction: ${error.message}`);
        await interaction.reply({ 
          content: 'There was an error while processing this button!', 
          ephemeral: true 
        });
      }
    }
    // Handle select menu interactions
    else if (interaction.isStringSelectMenu()) {
      logger.info(`Select menu interaction: ${interaction.customId} by ${interaction.user.tag}`);
      // Handle select menu interactions if needed
    }
  },
};
