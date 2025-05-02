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
        // Handle tic tac toe game interactions
        else if (type === 'ttt') {
          // Load the tic tac toe module dynamically
          const tictactoe = require('../commands/fun/tictactoe');
          await tictactoe.handleTicTacToeInteraction(interaction, action, params[0], params[1]);
        }
        // Handle trivia game interactions
        else if (type === 'trivia') {
          // Load the trivia module dynamically
          const trivia = require('../commands/fun/trivia');
          await trivia.handleTriviaInteraction(interaction, action, params[0], params[1]);
        }
        // Handle Rock Paper Scissors game interactions
        else if (type === 'rps') {
          // Load the RPS module dynamically
          const rps = require('../commands/fun/rps');
          await rps.handleRpsInteraction(interaction, action, params[0], params[1]);
        }
        // Handle Hangman game interactions
        else if (type === 'hangman') {
          // Load the Hangman module dynamically
          const hangman = require('../commands/fun/hangman');
          await hangman.handleHangmanInteraction(interaction, action, params[0]);
        }
        // Handle Word Scramble game interactions
        else if (type === 'scramble') {
          // Load the Scramble module dynamically
          const scramble = require('../commands/fun/scramble');
          await scramble.handleScrambleInteraction(interaction, action, params[0]);
        }
        // Handle Wordle game interactions
        else if (type === 'wordle') {
          // Load the Wordle module dynamically
          const wordle = require('../commands/fun/wordle');
          await wordle.handleWordleInteraction(interaction);
        }
        // Handle Poll interactions
        else if (type === 'poll') {
          // Load the Poll module dynamically
          const poll = require('../commands/fun/poll');
          await poll.handlePollInteraction(interaction);
        }
        // Handle RPSLS game interactions
        else if (type === 'rpsls') {
          // Load the RPSLS module dynamically
          const rpsls = require('../commands/fun/rpsls');
          
          // Special case for bot game
          if (action === 'bot_choice') {
            await rpsls.handleBotGame(interaction, params[0], params[1]);
          }
          // Special case for play again
          else if (action === 'play_again') {
            await rpsls.playAgainstBot(interaction);
          }
          // Standard game interactions
          else {
            await rpsls.handleRpslsInteraction(interaction, action, params[0], params[1]);
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
