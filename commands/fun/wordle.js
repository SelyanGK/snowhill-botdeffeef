const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

// Store active games: Map<channelId, gameData>
const activeGames = new Map();

// Word list for the game
const wordList = [
  'apple', 'beach', 'chair', 'dance', 'earth', 'flame', 'ghost', 'heart', 'igloo', 
  'jolly', 'knife', 'lemon', 'music', 'night', 'ocean', 'piano', 'quiet', 'royal', 
  'sugar', 'tiger', 'uncle', 'video', 'watch', 'xylophone', 'youth', 'zebra', 'brave',
  'cloud', 'dream', 'eagle', 'field', 'grace', 'happy', 'island', 'juice', 'kite', 
  'light', 'mountain', 'nature', 'olive', 'paper', 'quick', 'river', 'storm', 'train',
  'unity', 'vocal', 'water', 'young'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wordle')
    .setDescription('Play a word guessing game')
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Start a new Wordle game'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('guess')
        .setDescription('Make a guess in an active Wordle game')
        .addStringOption(option =>
          option.setName('word')
            .setDescription('Your 5-letter word guess')
            .setRequired(true))),
  
  cooldown: 3,
  
  /**
   * Executes the wordle command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'start') {
      await this.startGame(interaction);
    } else if (subcommand === 'guess') {
      await this.makeGuess(interaction);
    }
  },
  
  /**
   * Start a new Wordle game
   * @param {Interaction} interaction - The interaction
   */
  async startGame(interaction) {
    const channelId = interaction.channelId;
    
    // Check if there's already an active game in this channel
    if (activeGames.has(channelId)) {
      return interaction.reply({ 
        content: 'There is already an active Wordle game in this channel. Use `/wordle guess` to make a guess.', 
        ephemeral: true 
      });
    }
    
    // Select a random word from the word list
    const targetWord = wordList[Math.floor(Math.random() * wordList.length)];
    
    // Create a new game
    const gameData = {
      targetWord,
      guesses: [],
      startTime: Date.now(),
      hostId: interaction.user.id,
      maxGuesses: 6,
      isActive: true
    };
    
    // Store the game
    activeGames.set(channelId, gameData);
    
    // Create the initial embed
    const embed = new EmbedBuilder()
      .setTitle('🎮 Wordle Game Started!')
      .setDescription('I\'ve chosen a 5-letter word. Try to guess it!')
      .addFields(
        { name: 'How to Play', value: 'Use `/wordle guess [word]` to make a guess. You have 6 attempts.' },
        { name: 'Hint', value: 'Letters will be marked as:\n🟩 - Correct letter in correct position\n🟨 - Correct letter in wrong position\n⬛ - Letter not in the word' },
        { name: 'Guesses', value: '0/6' }
      )
      .setColor(config.embedColor || '#3498db')
      .setFooter({ text: `Started by ${interaction.user.tag}` })
      .setTimestamp();
      
    // Set a timeout to end the game after 10 minutes
    setTimeout(() => {
      const game = activeGames.get(channelId);
      if (game && game.isActive) {
        game.isActive = false;
        activeGames.set(channelId, game);
        
        try {
          interaction.channel.send({
            embeds: [new EmbedBuilder()
              .setTitle('⏱️ Wordle Game Timed Out')
              .setDescription(`The game has ended due to inactivity. The word was **${game.targetWord}**.`)
              .setColor('#e74c3c')
              .setTimestamp()]
          });
        } catch (error) {
          logger.error(`Error sending timeout message: ${error.message}`);
        }
      }
    }, 10 * 60 * 1000); // 10 minutes
    
    await interaction.reply({ embeds: [embed] });
    logger.info(`User ${interaction.user.tag} started a Wordle game in channel #${interaction.channel.name}`);
  },
  
  /**
   * Make a guess in an active Wordle game
   * @param {Interaction} interaction - The interaction
   */
  async makeGuess(interaction) {
    const channelId = interaction.channelId;
    
    // Check if there's an active game in this channel
    if (!activeGames.has(channelId)) {
      return interaction.reply({ 
        content: 'There is no active Wordle game in this channel. Start one with `/wordle start`.', 
        ephemeral: true 
      });
    }
    
    const game = activeGames.get(channelId);
    
    // Check if the game is still active
    if (!game.isActive) {
      return interaction.reply({ 
        content: 'The Wordle game in this channel has ended. Start a new one with `/wordle start`.', 
        ephemeral: true 
      });
    }
    
    // Get the guess
    const guess = interaction.options.getString('word').toLowerCase();
    
    // Validate the guess
    if (guess.length !== 5) {
      return interaction.reply({ 
        content: 'Your guess must be exactly 5 letters long.', 
        ephemeral: true 
      });
    }
    
    if (!/^[a-z]+$/.test(guess)) {
      return interaction.reply({ 
        content: 'Your guess must contain only letters.', 
        ephemeral: true 
      });
    }
    
    // Process the guess
    const result = this.evaluateGuess(guess, game.targetWord);
    game.guesses.push({ word: guess, result });
    
    // Update the game data
    activeGames.set(channelId, game);
    
    // Create the response embed
    const embed = new EmbedBuilder()
      .setTitle('🎮 Wordle Game')
      .setColor(config.embedColor || '#3498db')
      .setFooter({ text: `Played by ${interaction.user.tag}` })
      .setTimestamp();
    
    // Add the guess history
    const guessHistory = this.formatGuessHistory(game.guesses);
    embed.setDescription(guessHistory);
    
    // Add game status
    embed.addFields(
      { name: 'Guesses', value: `${game.guesses.length}/${game.maxGuesses}` }
    );
    
    // Check if the player won
    if (guess === game.targetWord) {
      game.isActive = false;
      activeGames.set(channelId, game);
      
      embed.setTitle('🎉 Wordle Game - You Won!');
      embed.setDescription(`Congratulations! You guessed the word **${game.targetWord}** correctly in ${game.guesses.length} tries!\n\n${guessHistory}`);
      embed.setColor('#2ecc71');
      
      // Calculate score (fewer guesses = better score)
      const score = Math.floor((game.maxGuesses - game.guesses.length + 1) * 20);
      embed.addFields(
        { name: 'Score', value: `${score} points`, inline: true },
        { name: 'Time', value: this.formatTime(Date.now() - game.startTime), inline: true }
      );
    }
    // Check if the player lost
    else if (game.guesses.length >= game.maxGuesses) {
      game.isActive = false;
      activeGames.set(channelId, game);
      
      embed.setTitle('😢 Wordle Game - You Lost');
      embed.setDescription(`Sorry! You've used all your guesses. The word was **${game.targetWord}**.\n\n${guessHistory}`);
      embed.setColor('#e74c3c');
    }
    
    // Create a new game button if the game is over
    const components = [];
    if (!game.isActive) {
      const newGameButton = new ButtonBuilder()
        .setCustomId('wordle_newgame')
        .setLabel('New Game')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎮');
      
      components.push(new ActionRowBuilder().addComponents(newGameButton));
    }
    
    await interaction.reply({ 
      embeds: [embed],
      components: components.length > 0 ? components : undefined
    });
    
    // Log the guess
    logger.info(`User ${interaction.user.tag} made a guess in Wordle game: ${guess}`);
  },
  
  /**
   * Handle button interactions for Wordle
   * @param {ButtonInteraction} interaction - The button interaction
   */
  async handleWordleInteraction(interaction) {
    // Check if it's a new game button
    if (interaction.customId === 'wordle_newgame') {
      // Create a new command interaction for the start command
      try {
        await this.startGame(interaction);
      } catch (error) {
        logger.error(`Error starting new Wordle game: ${error.message}`);
        await interaction.reply({ 
          content: 'An error occurred while starting a new game.', 
          ephemeral: true 
        });
      }
    }
  },
  
  /**
   * Evaluate a guess against the target word
   * @param {string} guess - The guessed word
   * @param {string} targetWord - The target word
   * @returns {string} - The result as a string of emoji
   */
  evaluateGuess(guess, targetWord) {
    const result = ['⬛', '⬛', '⬛', '⬛', '⬛'];
    const targetLetters = targetWord.split('');
    
    // First pass: Check for exact matches
    for (let i = 0; i < 5; i++) {
      if (guess[i] === targetWord[i]) {
        result[i] = '🟩';
        targetLetters[i] = null; // Mark as used
      }
    }
    
    // Second pass: Check for correct letters in wrong positions
    for (let i = 0; i < 5; i++) {
      if (result[i] === '⬛') { // Skip already matched letters
        const letterIndex = targetLetters.indexOf(guess[i]);
        if (letterIndex !== -1) {
          result[i] = '🟨';
          targetLetters[letterIndex] = null; // Mark as used
        }
      }
    }
    
    return result.join('');
  },
  
  /**
   * Format the guess history for display
   * @param {Array} guesses - The array of guesses
   * @returns {string} - Formatted history
   */
  formatGuessHistory(guesses) {
    return guesses.map((guess, index) => {
      return `${index + 1}. **${guess.word}** ${guess.result}`;
    }).join('\n');
  },
  
  /**
   * Format time in a readable format
   * @param {number} ms - Time in milliseconds
   * @returns {string} - Formatted time
   */
  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}m ${remainingSeconds}s`;
  }
};
