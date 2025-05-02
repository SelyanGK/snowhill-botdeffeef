const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

// Store active games
const activeGames = new Map();

// Word lists by category
const wordLists = {
  animals: [
    'dog', 'cat', 'elephant', 'giraffe', 'monkey', 'tiger', 'lion', 'zebra', 
    'penguin', 'kangaroo', 'dolphin', 'koala', 'rhinoceros', 'flamingo', 'cheetah', 
    'panda', 'eagle', 'shark', 'turtle', 'wolf', 'fox', 'rabbit', 'squirrel'
  ],
  colors: [
    'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'black', 
    'white', 'brown', 'gray', 'teal', 'maroon', 'violet', 'indigo', 'gold', 
    'silver', 'bronze', 'turquoise', 'magenta', 'crimson', 'azure'
  ],
  food: [
    'pizza', 'hamburger', 'pasta', 'sushi', 'taco', 'sandwich', 'chocolate', 
    'pancake', 'waffle', 'steak', 'salad', 'donut', 'muffin', 'banana', 'orange', 
    'apple', 'grape', 'strawberry', 'blueberry', 'carrot', 'potato', 'tomato', 'onion',
    'cookie', 'cupcake', 'icecream', 'burrito', 'noodles'
  ],
  countries: [
    'canada', 'australia', 'japan', 'brazil', 'france', 'germany', 'italy', 'spain', 
    'china', 'india', 'mexico', 'russia', 'egypt', 'ireland', 'greece', 'sweden', 
    'turkey', 'argentina', 'portugal', 'thailand'
  ]
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scramble')
    .setDescription('Play a word scramble game')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Choose a word category')
        .setRequired(false)
        .addChoices(
          { name: 'Animals', value: 'animals' },
          { name: 'Colors', value: 'colors' },
          { name: 'Food', value: 'food' },
          { name: 'Countries', value: 'countries' },
          { name: 'Random', value: 'random' }
        )),
  
  cooldown: 10,
  
  /**
   * Executes the scramble command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Check if there's already a game in this channel
      if (activeGames.has(interaction.channelId)) {
        return interaction.editReply('There\'s already a word scramble game in progress in this channel!');
      }
      
      // Get the category or random if not specified
      let category = interaction.options.getString('category') || 'random';
      
      // Select a random category if 'random' is chosen
      if (category === 'random') {
        const categories = Object.keys(wordLists);
        category = categories[Math.floor(Math.random() * categories.length)];
      }
      
      // Select a random word from the category
      const words = wordLists[category];
      const selectedWord = words[Math.floor(Math.random() * words.length)];
      
      // Scramble the word
      const scrambledWord = this.scrambleWord(selectedWord);
      
      // Create hint - show first letter and replace rest with underscores
      const hint = selectedWord.charAt(0) + ' ' + '_'.repeat(selectedWord.length - 1);
      
      // Generate a unique game ID
      const gameId = Date.now().toString();
      
      // Store the game data
      activeGames.set(interaction.channelId, {
        word: selectedWord,
        category: category,
        scrambled: scrambledWord,
        startTime: Date.now(),
        userId: interaction.user.id,
        hint: hint,
        hintRevealed: false,
        solved: false,
        messageId: null // Will be set after sending the message
      });
      
      // Create buttons
      const hintButton = new ButtonBuilder()
        .setCustomId(`scramble:${gameId}:hint`)
        .setLabel('Show Hint')
        .setStyle(ButtonStyle.Primary);
      
      const giveUpButton = new ButtonBuilder()
        .setCustomId(`scramble:${gameId}:giveup`)
        .setLabel('Give Up')
        .setStyle(ButtonStyle.Danger);
      
      const buttonRow = new ActionRowBuilder().addComponents(hintButton, giveUpButton);
      
      // Create the initial embed
      const embed = new EmbedBuilder()
        .setTitle('Word Scramble')
        .setDescription(`Unscramble this word: **${scrambledWord}**`)
        .addFields({ name: 'Category', value: this.formatCategory(category), inline: true })
        .setColor(config.embedColor)
        .setFooter({ text: `Started by ${interaction.user.tag} | Type your answer in the chat` })
        .setTimestamp();
      
      // Send the initial message
      const message = await interaction.editReply({ embeds: [embed], components: [buttonRow] });
      
      // Update the stored message ID
      const game = activeGames.get(interaction.channelId);
      if (game) {
        game.messageId = message.id;
      }
      
      // Set a timeout to end the game after 2 minutes
      setTimeout(() => this.handleGameTimeout(interaction.client, interaction.channelId), 2 * 60 * 1000);
      
      logger.info(`User ${interaction.user.tag} started a scramble game with word "${selectedWord}" in channel ${interaction.channelId}`);
    } catch (error) {
      logger.error(`Error executing scramble command: ${error.message}`);
      await interaction.editReply('An error occurred while starting the word scramble game.');
    }
  },
  
  /**
   * Handle button interactions for the scramble game
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {string} gameId - The game ID
   * @param {string} action - The button action
   */
  async handleScrambleInteraction(interaction, gameId, action) {
    // Get the game data
    const game = activeGames.get(interaction.channelId);
    
    // Check if the game exists
    if (!game || game.solved) {
      return interaction.reply({ content: 'This word scramble game has already ended.', ephemeral: true });
    }
    
    if (action === 'hint') {
      // Show hint button clicked
      if (game.hintRevealed) {
        return interaction.reply({ content: 'A hint has already been revealed!', ephemeral: true });
      }
      
      // Update game state
      game.hintRevealed = true;
      
      // Create hint - show first and last letter and dashes for the rest
      const firstLetter = game.word.charAt(0);
      const lastLetter = game.word.charAt(game.word.length - 1);
      let hint = firstLetter;
      
      for (let i = 1; i < game.word.length - 1; i++) {
        hint += '_';
      }
      
      hint += lastLetter;
      game.hint = hint;
      
      // Update the message
      await this.updateGameMessage(interaction.client, interaction.channelId, true);
      
      // Reply to the interaction
      await interaction.reply({ content: 'Hint revealed!', ephemeral: true });
    } else if (action === 'giveup') {
      // Give up button clicked
      // End the game and reveal the answer
      await this.endGame(interaction.client, interaction.channelId, null, true);
      
      // Reply to the interaction
      await interaction.reply({ content: 'Game ended. The answer has been revealed!', ephemeral: true });
    }
  },
  
  /**
   * Check a user's message against the current word
   * @param {Message} message - The message to check
   */
  async checkUserGuess(message) {
    // Get the game data for this channel
    const game = activeGames.get(message.channelId);
    
    // Check if there's an active game in this channel
    if (!game || game.solved) return;
    
    // Get the user's guess, removing any leading/trailing spaces and making it lowercase
    const guess = message.content.trim().toLowerCase();
    
    // Check if the guess matches the word
    if (guess === game.word) {
      // User guessed correctly!
      await this.endGame(message.client, message.channelId, message.author);
    }
  },
  
  /**
   * Update the game message with current state
   * @param {Client} client - The Discord client
   * @param {string} channelId - The channel ID
   * @param {boolean} showHint - Whether to show the hint
   */
  async updateGameMessage(client, channelId, showHint = false) {
    const game = activeGames.get(channelId);
    if (!game || !game.messageId) return;
    
    try {
      // Get the channel
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) return;
      
      // Get the message
      const message = await channel.messages.fetch(game.messageId).catch(() => null);
      if (!message) return;
      
      // Update the embed
      const embed = EmbedBuilder.from(message.embeds[0]);
      
      // Add hint field if requested
      if (showHint) {
        // Find if hint field already exists
        const fields = embed.data.fields || [];
        let hintFieldExists = false;
        
        for (let i = 0; i < fields.length; i++) {
          if (fields[i].name === 'Hint') {
            fields[i].value = game.hint;
            hintFieldExists = true;
            break;
          }
        }
        
        // Add hint field if it doesn't exist
        if (!hintFieldExists) {
          embed.addFields({ name: 'Hint', value: game.hint, inline: false });
        }
      }
      
      // Update the message
      await message.edit({ embeds: [embed] });
    } catch (error) {
      logger.error(`Error updating scramble game message: ${error.message}`);
    }
  },
  
  /**
   * Handle game timeout
   * @param {Client} client - The Discord client
   * @param {string} channelId - The channel ID
   */
  async handleGameTimeout(client, channelId) {
    const game = activeGames.get(channelId);
    if (!game || game.solved) return;
    
    // End the game with timeout
    await this.endGame(client, channelId, null, false, true);
  },
  
  /**
   * End the game and announce the result
   * @param {Client} client - The Discord client
   * @param {string} channelId - The channel ID
   * @param {User} winner - The winner (if any)
   * @param {boolean} gaveUp - Whether the game was ended by give up
   * @param {boolean} timedOut - Whether the game timed out
   */
  async endGame(client, channelId, winner = null, gaveUp = false, timedOut = false) {
    const game = activeGames.get(channelId);
    if (!game || game.solved) return;
    
    // Mark the game as solved
    game.solved = true;
    
    try {
      // Get the channel
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) return;
      
      // Get the message
      const message = await channel.messages.fetch(game.messageId).catch(() => null);
      if (!message) return;
      
      // Create the final embed
      let embed;
      
      if (winner) {
        // Someone won
        embed = new EmbedBuilder()
          .setTitle('Word Scramble - Solved!')
          .setDescription(`**${winner}** correctly unscrambled the word: **${game.word}**!`)
          .addFields(
            { name: 'Original Word', value: game.word, inline: true },
            { name: 'Scrambled Word', value: game.scrambled, inline: true },
            { name: 'Category', value: this.formatCategory(game.category), inline: true }
          )
          .setColor('#43B581') // Green
          .setFooter({ text: `Game started by ${client.users.cache.get(game.userId)?.tag || 'Unknown'}` })
          .setTimestamp();
      } else if (gaveUp) {
        // Someone gave up
        embed = new EmbedBuilder()
          .setTitle('Word Scramble - Game Over')
          .setDescription(`The game has ended. The correct word was: **${game.word}**`)
          .addFields(
            { name: 'Original Word', value: game.word, inline: true },
            { name: 'Scrambled Word', value: game.scrambled, inline: true },
            { name: 'Category', value: this.formatCategory(game.category), inline: true }
          )
          .setColor('#F04747') // Red
          .setFooter({ text: `Game started by ${client.users.cache.get(game.userId)?.tag || 'Unknown'}` })
          .setTimestamp();
      } else if (timedOut) {
        // Game timed out
        embed = new EmbedBuilder()
          .setTitle('Word Scramble - Time\'s Up!')
          .setDescription(`Time's up! The correct word was: **${game.word}**`)
          .addFields(
            { name: 'Original Word', value: game.word, inline: true },
            { name: 'Scrambled Word', value: game.scrambled, inline: true },
            { name: 'Category', value: this.formatCategory(game.category), inline: true }
          )
          .setColor('#FEE75C') // Yellow
          .setFooter({ text: `Game started by ${client.users.cache.get(game.userId)?.tag || 'Unknown'}` })
          .setTimestamp();
      }
      
      // Update the message
      await message.edit({ embeds: [embed], components: [] });
      
      // Remove the game from active games
      activeGames.delete(channelId);
      
      // Log the game end
      if (winner) {
        logger.info(`User ${winner.tag} won a scramble game in channel ${channelId} with word "${game.word}"`);
      } else if (gaveUp) {
        logger.info(`Scramble game for word "${game.word}" was ended by give up in channel ${channelId}`);
      } else if (timedOut) {
        logger.info(`Scramble game for word "${game.word}" timed out in channel ${channelId}`);
      }
    } catch (error) {
      logger.error(`Error ending scramble game: ${error.message}`);
      // Remove the game from active games regardless of error
      activeGames.delete(channelId);
    }
  },
  
  /**
   * Scramble a word
   * @param {string} word - The word to scramble
   * @returns {string} - The scrambled word
   */
  scrambleWord(word) {
    // Convert the word to an array of characters
    const characters = word.split('');
    
    // Fisher-Yates shuffle algorithm
    for (let i = characters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [characters[i], characters[j]] = [characters[j], characters[i]];
    }
    
    // Convert back to string
    let scrambled = characters.join('');
    
    // If the scrambled word is the same as the original, scramble again
    if (scrambled === word) {
      return this.scrambleWord(word);
    }
    
    return scrambled;
  },
  
  /**
   * Format a category name for display
   * @param {string} category - The category name
   * @returns {string} - The formatted category name
   */
  formatCategory(category) {
    const categoryEmojis = {
      animals: '🐾', // paw prints
      colors: '🌈', // rainbow
      food: '🍔', // hamburger
      countries: '🌎' // globe
    };
    
    return `${categoryEmojis[category] || '🎲'} ${category.charAt(0).toUpperCase() + category.slice(1)}`;
  }
};
