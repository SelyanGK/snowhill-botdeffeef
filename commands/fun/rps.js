const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

// Track active games
const activeGames = new Map();

// Define choices
const CHOICES = {
  ROCK: {
    name: 'Rock',
    emoji: '🪨',
    beats: 'SCISSORS'
  },
  PAPER: {
    name: 'Paper',
    emoji: '📄',
    beats: 'ROCK'
  },
  SCISSORS: {
    name: 'Scissors',
    emoji: '✂️',
    beats: 'PAPER'
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Play Rock Paper Scissors')
    .addUserOption(option =>
      option.setName('opponent')
        .setDescription('User to challenge (leave empty to play against the bot)')
        .setRequired(false)),
  
  cooldown: 60,
  
  /**
   * Executes the RPS command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    try {
      const opponent = interaction.options.getUser('opponent');
      
      // Generate a unique game ID
      const gameId = Math.random().toString(36).substring(2, 9);
      
      if (!opponent) {
        // Play against the bot
        await this.playAgainstBot(interaction);
      } else {
        // Can't play against yourself or bots
        if (opponent.id === interaction.user.id) {
          return interaction.reply({ content: 'You cannot challenge yourself!', ephemeral: true });
        }
        
        if (opponent.bot) {
          return interaction.reply({ content: 'You cannot challenge a bot with this command! Leave the opponent field empty to play against me.', ephemeral: true });
        }
        
        // Send challenge
        await this.sendChallenge(interaction, opponent, gameId);
      }
      
    } catch (error) {
      logger.error(`Error in RPS command: ${error.message}`);
      
      // Respond to the user
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: 'An error occurred while playing Rock Paper Scissors.' });
      } else {
        await interaction.reply({ content: 'An error occurred while playing Rock Paper Scissors.', ephemeral: true });
      }
    }
  },
  
  /**
   * Handle button interactions for the game
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {string} gameId - The ID of the game
   * @param {string} action - The action (choice or response)
   * @param {string} choice - The choice (ROCK, PAPER, SCISSORS) if applicable
   */
  async handleRpsInteraction(interaction, gameId, action, choice) {
    try {
      // Get the game data
      const game = activeGames.get(gameId);
      
      if (!game) {
        return interaction.reply({ content: 'This game no longer exists or has expired.', ephemeral: true });
      }
      
      if (action === 'challenge') {
        // Handle challenge response
        await this.handleChallengeResponse(interaction, game, choice);
      } else if (action === 'choice') {
        // Handle player choice
        await this.handlePlayerChoice(interaction, game, choice);
      }
    } catch (error) {
      logger.error(`Error handling RPS interaction: ${error.message}`);
      await interaction.reply({ content: 'An error occurred while processing your action.', ephemeral: true });
    }
  },
  
  /**
   * Send a challenge to another user
   * @param {Interaction} interaction - The original interaction
   * @param {User} opponent - The opponent to challenge
   * @param {string} gameId - The unique game ID
   */
  async sendChallenge(interaction, opponent, gameId) {
    // Create the game data
    const game = {
      id: gameId,
      challenger: interaction.user.id,
      opponent: opponent.id,
      choices: {},
      expireAt: Date.now() + (5 * 60 * 1000) // 5 minute expiration
    };
    
    // Save the game
    activeGames.set(gameId, game);
    
    // Create the challenge embed
    const embed = new EmbedBuilder()
      .setTitle('Rock Paper Scissors Challenge!')
      .setDescription(`${interaction.user} has challenged ${opponent} to a game of Rock Paper Scissors!`)
      .setColor(config.embedColor)
      .addFields({ name: 'How to Play', value: 'Click one of the buttons below to accept or decline the challenge.' })
      .setFooter({ text: `Game ID: ${gameId}` })
      .setTimestamp();
    
    // Create the buttons
    const acceptButton = new ButtonBuilder()
      .setCustomId(`rps:${gameId}:challenge:accept`)
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success);
    
    const declineButton = new ButtonBuilder()
      .setCustomId(`rps:${gameId}:challenge:decline`)
      .setLabel('Decline')
      .setStyle(ButtonStyle.Danger);
    
    const row = new ActionRowBuilder().addComponents(acceptButton, declineButton);
    
    // Send the challenge
    await interaction.reply({
      content: `${opponent}`,
      embeds: [embed],
      components: [row]
    });
    
    logger.info(`User ${interaction.user.tag} challenged ${opponent.tag} to RPS`);
    
    // Set up a timer to expire the challenge
    setTimeout(() => {
      // Check if the game still exists and is in the challenge phase
      const currentGame = activeGames.get(gameId);
      if (currentGame && !currentGame.choices[currentGame.opponent]) {
        // Delete the game
        activeGames.delete(gameId);
        
        // Try to update the message if possible
        try {
          interaction.editReply({
            content: `${opponent}`,
            embeds: [embed.setDescription(`The challenge to ${opponent} has expired.`).setColor(0x888888)],
            components: []
          }).catch(() => {});
        } catch (error) {
          // Ignore errors here, the message might have been deleted
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  },
  
  /**
   * Handle a response to a challenge
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {Object} game - The game data
   * @param {string} response - The response (accept or decline)
   */
  async handleChallengeResponse(interaction, game, response) {
    // Make sure the person responding is the opponent
    if (interaction.user.id !== game.opponent) {
      return interaction.reply({ content: 'This challenge is not for you!', ephemeral: true });
    }
    
    if (response === 'decline') {
      // Remove the game
      activeGames.delete(game.id);
      
      // Update the message
      const embed = new EmbedBuilder()
        .setTitle('Challenge Declined')
        .setDescription(`${interaction.user} has declined the Rock Paper Scissors challenge.`)
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.update({
        content: null,
        embeds: [embed],
        components: []
      });
      
      logger.info(`User ${interaction.user.tag} declined an RPS challenge`);
      return;
    }
    
    // Accept the challenge
    const challenger = await interaction.client.users.fetch(game.challenger);
    
    // Create the game embed
    const embed = new EmbedBuilder()
      .setTitle('Rock Paper Scissors')
      .setDescription(`${challenger} vs ${interaction.user}\n\nBoth players, please make your choice by clicking the buttons below. Your choice will be hidden from the other player.`)
      .setColor(config.embedColor)
      .setFooter({ text: `Game ID: ${game.id}` })
      .setTimestamp();
    
    // Create the buttons
    const row = this.createChoiceButtons(game.id);
    
    // Update the message
    await interaction.update({
      content: null,
      embeds: [embed],
      components: [row]
    });
    
    logger.info(`User ${interaction.user.tag} accepted an RPS challenge from ${challenger.tag}`);
  },
  
  /**
   * Handle a player's choice
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {Object} game - The game data
   * @param {string} choice - The choice (ROCK, PAPER, SCISSORS)
   */
  async handlePlayerChoice(interaction, game, choice) {
    // Make sure the person is one of the players
    if (interaction.user.id !== game.challenger && interaction.user.id !== game.opponent) {
      return interaction.reply({ content: 'You are not part of this game!', ephemeral: true });
    }
    
    // Record the choice
    game.choices[interaction.user.id] = choice;
    
    // Acknowledge the choice privately
    await interaction.reply({
      content: `You chose ${CHOICES[choice].emoji} ${CHOICES[choice].name}!`,
      ephemeral: true
    });
    
    // Check if both players have made their choices
    if (Object.keys(game.choices).length === 2) {
      // Both have chosen, determine the winner
      await this.resolvePvpGame(interaction, game);
    } else {
      // Still waiting for the other player
      const waitingFor = interaction.user.id === game.challenger ? game.opponent : game.challenger;
      const waitingUser = await interaction.client.users.fetch(waitingFor);
      
      // Create a waiting embed
      const embed = new EmbedBuilder()
        .setTitle('Rock Paper Scissors')
        .setDescription(`${interaction.user} has made their choice.\n\nWaiting for ${waitingUser} to make a choice...`)
        .setColor(config.embedColor)
        .setFooter({ text: `Game ID: ${game.id}` })
        .setTimestamp();
      
      // Update the message
      await interaction.message.edit({
        content: null,
        embeds: [embed],
        components: [this.createChoiceButtons(game.id)] // Keep the buttons for the other player
      });
    }
  },
  
  /**
   * Resolve a PvP game and determine the winner
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {Object} game - The game data
   */
  async resolvePvpGame(interaction, game) {
    // Get both player objects
    const challenger = await interaction.client.users.fetch(game.challenger);
    const opponent = await interaction.client.users.fetch(game.opponent);
    
    // Get choices
    const challengerChoice = game.choices[game.challenger];
    const opponentChoice = game.choices[game.opponent];
    
    // Determine the winner
    let result;
    let winnerUser;
    
    if (challengerChoice === opponentChoice) {
      // It's a tie
      result = "It's a tie!";
    } else if (CHOICES[challengerChoice].beats === opponentChoice) {
      // Challenger wins
      result = `${challenger} wins!`;
      winnerUser = challenger;
    } else {
      // Opponent wins
      result = `${opponent} wins!`;
      winnerUser = opponent;
    }
    
    // Create the results embed
    const embed = new EmbedBuilder()
      .setTitle('Rock Paper Scissors Results')
      .setDescription(`${challenger} chose ${CHOICES[challengerChoice].emoji} ${CHOICES[challengerChoice].name}\n${opponent} chose ${CHOICES[opponentChoice].emoji} ${CHOICES[opponentChoice].name}\n\n**${result}**`)
      .setColor(winnerUser ? 0x00ff00 : 0xffff00) // Green for win, Yellow for tie
      .setTimestamp();
    
    // Update the message
    await interaction.message.edit({
      content: null,
      embeds: [embed],
      components: [] // Remove the buttons
    });
    
    // Clean up the game
    activeGames.delete(game.id);
    
    logger.info(`RPS game completed: ${challenger.tag} (${challengerChoice}) vs ${opponent.tag} (${opponentChoice}) - ${result}`);
  },
  
  /**
   * Create the buttons for making a choice
   * @param {string} gameId - The game ID
   * @returns {ActionRowBuilder} The row of buttons
   */
  createChoiceButtons(gameId) {
    const rockButton = new ButtonBuilder()
      .setCustomId(`rps:${gameId}:choice:ROCK`)
      .setLabel('Rock')
      .setEmoji('🪨')
      .setStyle(ButtonStyle.Primary);
    
    const paperButton = new ButtonBuilder()
      .setCustomId(`rps:${gameId}:choice:PAPER`)
      .setLabel('Paper')
      .setEmoji('📄')
      .setStyle(ButtonStyle.Primary);
    
    const scissorsButton = new ButtonBuilder()
      .setCustomId(`rps:${gameId}:choice:SCISSORS`)
      .setLabel('Scissors')
      .setEmoji('✂️')
      .setStyle(ButtonStyle.Primary);
    
    return new ActionRowBuilder().addComponents(rockButton, paperButton, scissorsButton);
  },
  
  /**
   * Play against the bot
   * @param {Interaction} interaction - The interaction
   */
  async playAgainstBot(interaction) {
    await interaction.deferReply();
    
    // Create the embed for the initial message
    const embed = new EmbedBuilder()
      .setTitle('Rock Paper Scissors')
      .setDescription(`${interaction.user} vs. Bot\n\nMake your choice!`)
      .setColor(config.embedColor)
      .setTimestamp();
    
    // Create the buttons
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('rps_bot_rock')
          .setLabel('Rock')
          .setEmoji('🪨')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('rps_bot_paper')
          .setLabel('Paper')
          .setEmoji('📄')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('rps_bot_scissors')
          .setLabel('Scissors')
          .setEmoji('✂️')
          .setStyle(ButtonStyle.Primary)
      );
    
    const message = await interaction.editReply({
      embeds: [embed],
      components: [row]
    });
    
    // Create a collector for the buttons
    const filter = i => i.user.id === interaction.user.id && i.message.id === message.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });
    
    collector.on('collect', async i => {
      // Parse the user's choice
      let userChoice;
      if (i.customId === 'rps_bot_rock') userChoice = 'ROCK';
      else if (i.customId === 'rps_bot_paper') userChoice = 'PAPER';
      else if (i.customId === 'rps_bot_scissors') userChoice = 'SCISSORS';
      
      // Generate the bot's choice
      const choices = ['ROCK', 'PAPER', 'SCISSORS'];
      const botChoice = choices[Math.floor(Math.random() * choices.length)];
      
      // Determine the winner
      let result;
      
      if (userChoice === botChoice) {
        // It's a tie
        result = "It's a tie!";
      } else if (CHOICES[userChoice].beats === botChoice) {
        // User wins
        result = `${interaction.user} wins!`;
      } else {
        // Bot wins
        result = `Bot wins!`;
      }
      
      // Create the results embed
      const resultsEmbed = new EmbedBuilder()
        .setTitle('Rock Paper Scissors Results')
        .setDescription(`${interaction.user} chose ${CHOICES[userChoice].emoji} ${CHOICES[userChoice].name}\nBot chose ${CHOICES[botChoice].emoji} ${CHOICES[botChoice].name}\n\n**${result}**`)
        .setColor(result.includes(interaction.user.username) ? 0x00ff00 : (result.includes('tie') ? 0xffff00 : 0xff0000))
        .setTimestamp();
      
      // Update the message
      await i.update({
        embeds: [resultsEmbed],
        components: [] // Remove the buttons
      });
      
      // Stop the collector
      collector.stop();
      
      logger.info(`User ${interaction.user.tag} played RPS against bot - User: ${userChoice}, Bot: ${botChoice}, Result: ${result}`);
    });
    
    collector.on('end', async (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        // User didn't make a choice in time
        const timeoutEmbed = new EmbedBuilder()
          .setTitle('Rock Paper Scissors - Timed Out')
          .setDescription('You did not make a choice in time. The game has been cancelled.')
          .setColor(0xff0000)
          .setTimestamp();
        
        await interaction.editReply({
          embeds: [timeoutEmbed],
          components: []
        }).catch(() => {});
      }
    });
  }
};
