const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

// Store active games
const activeGames = new Map();

// Word categories with appropriate words
const categories = {
  animals: [
    'ELEPHANT', 'KANGAROO', 'DOLPHIN', 'PENGUIN', 'GIRAFFE', 'ZEBRA', 'TIGER', 'LION', 
    'MONKEY', 'PANDA', 'KOALA', 'LEOPARD', 'GORILLA', 'FLAMINGO', 'CROCODILE', 'HEDGEHOG'
  ],
  food: [
    'PIZZA', 'HAMBURGER', 'SPAGHETTI', 'PANCAKE', 'CHOCOLATE', 'SANDWICH', 'TACO', 'SUSHI', 
    'CUPCAKE', 'WAFFLE', 'POPCORN', 'LASAGNA', 'AVOCADO', 'BURRITO', 'CHEESECAKE', 'NOODLE'
  ],
  countries: [
    'BRAZIL', 'FRANCE', 'CANADA', 'AUSTRALIA', 'GERMANY', 'ITALY', 'JAPAN', 'MEXICO', 
    'SWEDEN', 'EGYPT', 'THAILAND', 'KOREA', 'PORTUGAL', 'NIGERIA', 'ICELAND', 'IRELAND'
  ],
  gaming: [
    'MINECRAFT', 'FORTNITE', 'VALORANT', 'OVERWATCH', 'POKEMON', 'TETRIS', 'ROBLOX', 'SKYRIM', 
    'ZELDA', 'HALO', 'SONIC', 'MARIO', 'AMONG', 'LEAGUE', 'DIABLO', 'SPLATOON'
  ],
  technology: [
    'COMPUTER', 'KEYBOARD', 'SMARTPHONE', 'INTERNET', 'BLUETOOTH', 'HEADPHONE', 'MONITOR', 'PRINTER', 
    'CAMERA', 'SPEAKER', 'ROUTER', 'TABLET', 'DISCORD', 'YOUTUBE', 'SERVER', 'NETWORK'
  ]
};

// Hangman stages
const hangmanStages = [
  `
  +---+
  |   |
      |
      |
      |
      |
=========`,
  `
  +---+
  |   |
  O   |
      |
      |
      |
=========`,
  `
  +---+
  |   |
  O   |
  |   |
      |
      |
=========`,
  `
  +---+
  |   |
  O   |
 /|   |
      |
      |
=========`,
  `
  +---+
  |   |
  O   |
 /|\  |
      |
      |
=========`,
  `
  +---+
  |   |
  O   |
 /|\  |
 /    |
      |
=========`,
  `
  +---+
  |   |
  O   |
 /|\  |
 / \  |
      |
=========`
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hangman')
    .setDescription('Play a game of Hangman')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Word category')
        .setRequired(true)
        .addChoices(
          { name: 'Animals', value: 'animals' },
          { name: 'Food', value: 'food' },
          { name: 'Countries', value: 'countries' },
          { name: 'Gaming', value: 'gaming' },
          { name: 'Technology', value: 'technology' }
        )),
  
  cooldown: 30, // 30 seconds cooldown
  
  /**
   * Executes the hangman command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Check if user already has an active game
      const existingGame = Array.from(activeGames.values()).find(game => 
        game.userId === interaction.user.id && game.channelId === interaction.channelId
      );
      
      if (existingGame) {
        return interaction.editReply('You already have an active Hangman game in this channel. Please finish it before starting a new one.');
      }
      
      // Get the selected category
      const category = interaction.options.getString('category');
      
      // Randomly select a word from the chosen category
      const words = categories[category];
      const word = words[Math.floor(Math.random() * words.length)];
      
      // Create a new game
      const gameId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      const game = {
        id: gameId,
        userId: interaction.user.id,
        channelId: interaction.channelId,
        word: word,
        guessedLetters: [],
        incorrectGuesses: 0,
        status: 'active', // 'active', 'won', 'lost'
        startTime: Date.now()
      };
      
      // Store the game
      activeGames.set(gameId, game);
      
      // Send the initial game state
      const { embed, components } = this.createGameMessage(game);
      const message = await interaction.editReply({
        embeds: [embed],
        components: components
      });
      
      // Set game cleanup after 10 minutes of inactivity
      setTimeout(() => {
        const currentGame = activeGames.get(gameId);
        if (currentGame && currentGame.status === 'active') {
          // Game is still active after timeout, mark it as abandoned
          activeGames.delete(gameId);
          
          // Try to update the message
          const timeoutEmbed = new EmbedBuilder()
            .setTitle('Hangman - Game Timed Out')
            .setDescription(`The game has been abandoned due to inactivity.\nThe word was: **${game.word}**`)
            .setColor(0x888888)
            .setFooter({ text: `Category: ${category.charAt(0).toUpperCase() + category.slice(1)}` });
          
          interaction.editReply({
            embeds: [timeoutEmbed],
            components: []
          }).catch(() => {});
          
          logger.info(`Hangman game ${gameId} timed out after inactivity`);
        }
      }, 10 * 60 * 1000); // 10 minutes
      
      logger.info(`User ${interaction.user.tag} started a Hangman game with word: ${word}`);
    } catch (error) {
      logger.error(`Error executing hangman command: ${error.message}`);
      await interaction.editReply('An error occurred while starting the Hangman game. Please try again.');
    }
  },
  
  /**
   * Handles button interactions for Hangman
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {string} gameId - The game ID
   * @param {string} action - The button action
   */
  async handleHangmanInteraction(interaction, gameId, action) {
    // Get the game
    const game = activeGames.get(gameId);
    
    if (!game) {
      return interaction.reply({
        content: 'This game no longer exists or has expired.',
        ephemeral: true
      });
    }
    
    // Only the game creator can play
    if (interaction.user.id !== game.userId) {
      return interaction.reply({
        content: 'This is not your game. Start your own game using /hangman.',
        ephemeral: true
      });
    }
    
    // Check if the game is still active
    if (game.status !== 'active') {
      return interaction.reply({
        content: 'This game has already ended. Start a new game using /hangman.',
        ephemeral: true
      });
    }
    
    // If action is a letter
    if (action.match(/^[A-Z]$/)) {
      const letter = action;
      
      // Check if the letter has already been guessed
      if (game.guessedLetters.includes(letter)) {
        return interaction.reply({
          content: `You have already guessed the letter ${letter}!`,
          ephemeral: true
        });
      }
      
      // Add the letter to guessed letters
      game.guessedLetters.push(letter);
      
      // Check if the letter is in the word
      if (game.word.includes(letter)) {
        // Check if the player has won
        const hasWon = this.checkForWin(game);
        
        if (hasWon) {
          game.status = 'won';
          activeGames.delete(gameId); // Remove the game from active games
        }
      } else {
        // Increment incorrect guesses
        game.incorrectGuesses++;
        
        // Check if the player has lost
        if (game.incorrectGuesses >= 6) {
          game.status = 'lost';
          activeGames.delete(gameId); // Remove the game from active games
        }
      }
      
      // Update the game message
      const { embed, components } = this.createGameMessage(game);
      await interaction.update({
        embeds: [embed],
        components: components
      });
      
      // Log game progress
      logger.info(`Hangman progress - User ${interaction.user.tag} guessed ${letter}, incorrect: ${game.incorrectGuesses}, status: ${game.status}`);
    } else if (action === 'giveup') {
      // Player is giving up
      game.status = 'lost';
      activeGames.delete(gameId);
      
      // Update the message
      const embed = new EmbedBuilder()
        .setTitle('Hangman - Game Over')
        .setDescription(
          `You gave up!\n\n` +
          `The word was: **${game.word}**\n\n` +
          `${hangmanStages[game.incorrectGuesses]}\n\n` +
          `Better luck next time.`
        )
        .setColor(0xff0000)
        .setFooter({ text: `Game ended` })
        .setTimestamp();
      
      await interaction.update({
        embeds: [embed],
        components: []
      });
      
      logger.info(`User ${interaction.user.tag} gave up on Hangman game with word: ${game.word}`);
    }
  },
  
  /**
   * Check if the player has won the game
   * @param {Object} game - The game object
   * @returns {boolean} - Whether the player has won
   */
  checkForWin(game) {
    return [...game.word].every(letter => game.guessedLetters.includes(letter));
  },
  
  /**
   * Creates the game message with the current state
   * @param {Object} game - The game object
   * @returns {Object} - The embed and components for the message
   */
  createGameMessage(game) {
    // Create the word display
    const wordDisplay = [...game.word].map(letter => 
      game.guessedLetters.includes(letter) ? letter : '_'
    ).join(' ');
    
    // Create the guessed letters display
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const guessedDisplay = [...alphabet].map(letter => 
      game.guessedLetters.includes(letter) ? 
        (game.word.includes(letter) ? `✅ ${letter}` : `❌ ${letter}`) : 
        `⬛ ${letter}`
    ).join(' ');
    
    // Create the game embed
    let embed;
    
    if (game.status === 'active') {
      embed = new EmbedBuilder()
        .setTitle('Hangman')
        .setDescription(
          `Word: **${wordDisplay}**\n\n` +
          `${hangmanStages[game.incorrectGuesses]}\n\n` +
          `Incorrect Guesses: ${game.incorrectGuesses}/6\n\n` +
          `Guessed Letters:\n${guessedDisplay}`
        )
        .setColor(config.embedColor)
        .setFooter({ text: `Started by ${game.userId}` });
    } else if (game.status === 'won') {
      embed = new EmbedBuilder()
        .setTitle('Hangman - You Won!')
        .setDescription(
          `Congratulations! You guessed the word!\n\n` +
          `Word: **${game.word}**\n\n` +
          `${hangmanStages[game.incorrectGuesses]}\n\n` +
          `Incorrect Guesses: ${game.incorrectGuesses}/6`
        )
        .setColor(0x00ff00)
        .setFooter({ text: `Game completed` })
        .setTimestamp();
    } else {
      embed = new EmbedBuilder()
        .setTitle('Hangman - Game Over')
        .setDescription(
          `You lost!\n\n` +
          `The word was: **${game.word}**\n\n` +
          `${hangmanStages[game.incorrectGuesses]}\n\n` +
          `Better luck next time.`
        )
        .setColor(0xff0000)
        .setFooter({ text: `Game ended` })
        .setTimestamp();
    }
    
    // Create components (buttons)
    let components = [];
    
    if (game.status === 'active') {
      // Create letter buttons (3 rows of 9, 9, and 8 letters)
      let rows = [];
      
      // First row: A through I
      const row1 = new ActionRowBuilder();
      for (let i = 0; i < 9; i++) {
        const letter = alphabet[i];
        row1.addComponents(
          new ButtonBuilder()
            .setCustomId(`hangman:${game.id}:${letter}`)
            .setLabel(letter)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(game.guessedLetters.includes(letter))
        );
      }
      rows.push(row1);
      
      // Second row: J through R
      const row2 = new ActionRowBuilder();
      for (let i = 9; i < 18; i++) {
        const letter = alphabet[i];
        row2.addComponents(
          new ButtonBuilder()
            .setCustomId(`hangman:${game.id}:${letter}`)
            .setLabel(letter)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(game.guessedLetters.includes(letter))
        );
      }
      rows.push(row2);
      
      // Third row: S through Z
      const row3 = new ActionRowBuilder();
      for (let i = 18; i < 26; i++) {
        const letter = alphabet[i];
        row3.addComponents(
          new ButtonBuilder()
            .setCustomId(`hangman:${game.id}:${letter}`)
            .setLabel(letter)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(game.guessedLetters.includes(letter))
        );
      }
      
      // Add Give Up button to the third row
      row3.addComponents(
        new ButtonBuilder()
          .setCustomId(`hangman:${game.id}:giveup`)
          .setLabel('Give Up')
          .setStyle(ButtonStyle.Danger)
      );
      
      rows.push(row3);
      
      components = rows;
    }
    
    return { embed, components };
  }
};
