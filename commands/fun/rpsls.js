const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

// Store active games: Map<gameId, gameData>
const activeGames = new Map();

// Choices for the game
const CHOICES = {
  ROCK: { emoji: '🪨', beats: ['SCISSORS', 'LIZARD'] },
  PAPER: { emoji: '📄', beats: ['ROCK', 'SPOCK'] },
  SCISSORS: { emoji: '✂️', beats: ['PAPER', 'LIZARD'] },
  LIZARD: { emoji: '🦎', beats: ['PAPER', 'SPOCK'] },
  SPOCK: { emoji: '🖖', beats: ['ROCK', 'SCISSORS'] }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rpsls')
    .setDescription('Play Rock Paper Scissors Lizard Spock with the bot or another user')
    .addUserOption(option =>
      option.setName('opponent')
        .setDescription('The user to challenge (leave empty to play against the bot)')
        .setRequired(false)),
  
  cooldown: 5,
  
  /**
   * Executes the RPSLS command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    try {
      // Check if the user wants to play against another user or the bot
      const opponent = interaction.options.getUser('opponent');
      
      if (opponent) {
        // Don't allow playing against self or bots
        if (opponent.id === interaction.user.id) {
          return interaction.reply({ 
            content: 'You cannot challenge yourself!', 
            ephemeral: true 
          });
        }
        
        if (opponent.bot) {
          return interaction.reply({ 
            content: 'You cannot challenge a bot user!', 
            ephemeral: true 
          });
        }
        
        // Generate a unique game ID
        const gameId = `${interaction.user.id}-${Date.now()}`;
        
        // Create a new PvP game
        const game = {
          id: gameId,
          challenger: interaction.user,
          opponent,
          channel: interaction.channel,
          challengerChoice: null,
          opponentChoice: null,
          status: 'PENDING', // PENDING, ACTIVE, COMPLETED
          startTime: Date.now()
        };
        
        // Store the game
        activeGames.set(gameId, game);
        
        // Send challenge to the opponent
        await this.sendChallenge(interaction, opponent, gameId);
      } else {
        // Play against the bot
        await this.playAgainstBot(interaction);
      }
    } catch (error) {
      logger.error(`Error executing RPSLS command: ${error.message}`);
      await interaction.reply({ 
        content: 'There was an error executing the command. Please try again.',
        ephemeral: true 
      });
    }
  },
  
  /**
   * Handle button interactions for the game
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {string} gameId - The ID of the game
   * @param {string} action - The action (choice or response)
   * @param {string} choice - The choice (ROCK, PAPER, etc.) if applicable
   */
  async handleRpslsInteraction(interaction, gameId, action, choice) {
    // Get the game data
    const game = activeGames.get(gameId);
    
    // If game doesn't exist, return error
    if (!game) {
      return interaction.reply({ 
        content: 'This game no longer exists or has expired.',
        ephemeral: true 
      });
    }
    
    // Handle different actions
    if (action === 'response') {
      await this.handleChallengeResponse(interaction, game, choice);
    } else if (action === 'choice') {
      await this.handlePlayerChoice(interaction, game, choice);
    }
  },
  
  /**
   * Send a challenge to another user
   * @param {Interaction} interaction - The original interaction
   * @param {User} opponent - The opponent to challenge
   * @param {string} gameId - The unique game ID
   */
  async sendChallenge(interaction, opponent, gameId) {
    // Create the challenge embed
    const embed = new EmbedBuilder()
      .setTitle('🎮 Rock Paper Scissors Lizard Spock Challenge!')
      .setDescription(`${interaction.user} has challenged you to a game of Rock Paper Scissors Lizard Spock!`)
      .setColor(config.embedColor || '#3498db')
      .addFields(
        { name: 'How to Play', value: 'Rock crushes Scissors and Lizard\nPaper covers Rock and disproves Spock\nScissors cuts Paper and decapitates Lizard\nLizard eats Paper and poisons Spock\nSpock smashes Scissors and vaporizes Rock' }
      )
      .setFooter({ text: 'Accept the challenge to play!' })
      .setTimestamp();
    
    // Create accept/decline buttons
    const acceptButton = new ButtonBuilder()
      .setCustomId(`rpsls:response:${gameId}:accept`)
      .setLabel('Accept Challenge')
      .setStyle(ButtonStyle.Success)
      .setEmoji('👍');
    
    const declineButton = new ButtonBuilder()
      .setCustomId(`rpsls:response:${gameId}:decline`)
      .setLabel('Decline Challenge')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('👎');
    
    const row = new ActionRowBuilder().addComponents(acceptButton, declineButton);
    
    // Send the challenge
    await interaction.reply({
      content: `${opponent}, you've been challenged to a game of Rock Paper Scissors Lizard Spock!`,
      embeds: [embed],
      components: [row]
    });
    
    // Set a timeout to expire the challenge after 5 minutes
    setTimeout(() => {
      const game = activeGames.get(gameId);
      if (game && game.status === 'PENDING') {
        // Delete the game
        activeGames.delete(gameId);
        
        // Try to update the message
        try {
          interaction.editReply({
            content: `${opponent} did not respond to the challenge in time.`,
            embeds: [embed],
            components: [] // Remove the buttons
          }).catch(() => {}); // Ignore errors if message is too old
        } catch (error) {
          logger.error(`Error updating expired challenge: ${error.message}`);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    logger.info(`User ${interaction.user.tag} challenged ${opponent.tag} to RPSLS`);
  },
  
  /**
   * Handle a response to a challenge
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {Object} game - The game data
   * @param {string} response - The response (accept or decline)
   */
  async handleChallengeResponse(interaction, game, response) {
    // Check if the user is the opponent
    if (interaction.user.id !== game.opponent.id) {
      return interaction.reply({ 
        content: 'This challenge is not for you!', 
        ephemeral: true 
      });
    }
    
    // Check if the game is still pending
    if (game.status !== 'PENDING') {
      return interaction.reply({ 
        content: 'This challenge has already been responded to.', 
        ephemeral: true 
      });
    }
    
    if (response === 'decline') {
      // Handle declined challenge
      game.status = 'COMPLETED';
      activeGames.set(game.id, game);
      
      await interaction.update({
        content: `${interaction.user} declined the challenge.`,
        embeds: [],
        components: []
      });
      
      logger.info(`User ${interaction.user.tag} declined RPSLS challenge from ${game.challenger.tag}`);
    } else if (response === 'accept') {
      // Handle accepted challenge
      game.status = 'ACTIVE';
      activeGames.set(game.id, game);
      
      // Create the game embed
      const embed = new EmbedBuilder()
        .setTitle('🎮 Rock Paper Scissors Lizard Spock')
        .setDescription('Choose your move! Your choice will be hidden from your opponent.')
        .setColor(config.embedColor || '#3498db')
        .addFields(
          { name: 'Players', value: `${game.challenger} vs ${game.opponent}` },
          { name: 'Status', value: '⏳ Waiting for both players to make their choices...' }
        )
        .setFooter({ text: 'Game in progress' })
        .setTimestamp();
      
      // Create buttons for choices
      const row = this.createChoiceButtons(game.id);
      
      await interaction.update({
        content: 'The challenge has been accepted! Both players, make your choices!',
        embeds: [embed],
        components: [row]
      });
      
      // Set a timeout to expire the game after 2 minutes of inactivity
      setTimeout(() => {
        const updatedGame = activeGames.get(game.id);
        if (updatedGame && updatedGame.status === 'ACTIVE') {
          // Check if any player hasn't made a choice
          if (!updatedGame.challengerChoice || !updatedGame.opponentChoice) {
            // End the game
            updatedGame.status = 'COMPLETED';
            activeGames.set(updatedGame.id, updatedGame);
            
            // Try to update the message
            try {
              const noChoicePlayer = !updatedGame.challengerChoice ? updatedGame.challenger : updatedGame.opponent;
              interaction.editReply({
                content: `Game cancelled because ${noChoicePlayer} didn't make a choice in time.`,
                embeds: [],
                components: []
              }).catch(() => {}); // Ignore errors if message is too old
            } catch (error) {
              logger.error(`Error updating expired game: ${error.message}`);
            }
          }
        }
      }, 2 * 60 * 1000); // 2 minutes
      
      logger.info(`User ${interaction.user.tag} accepted RPSLS challenge from ${game.challenger.tag}`);
    }
  },
  
  /**
   * Handle a player's choice
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {Object} game - The game data
   * @param {string} choice - The choice (ROCK, PAPER, etc.)
   */
  async handlePlayerChoice(interaction, game, choice) {
    // Check if the game is active
    if (game.status !== 'ACTIVE') {
      return interaction.reply({ 
        content: 'This game is no longer active!', 
        ephemeral: true 
      });
    }
    
    // Check if the user is part of the game
    const isChallenger = interaction.user.id === game.challenger.id;
    const isOpponent = interaction.user.id === game.opponent.id;
    
    if (!isChallenger && !isOpponent) {
      return interaction.reply({ 
        content: 'You are not part of this game!', 
        ephemeral: true 
      });
    }
    
    // Save the player's choice
    if (isChallenger) {
      game.challengerChoice = choice;
    } else {
      game.opponentChoice = choice;
    }
    
    // Update the game data
    activeGames.set(game.id, game);
    
    // Confirm the choice to the player
    await interaction.reply({ 
      content: `You chose ${CHOICES[choice].emoji} ${choice}!`, 
      ephemeral: true 
    });
    
    // If both players have made their choices, resolve the game
    if (game.challengerChoice && game.opponentChoice) {
      await this.resolvePvpGame(interaction, game);
    }
  },
  
  /**
   * Resolve a PvP game and determine the winner
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {Object} game - The game data
   */
  async resolvePvpGame(interaction, game) {
    // Mark the game as completed
    game.status = 'COMPLETED';
    activeGames.set(game.id, game);
    
    // Get the choices
    const challengerChoice = game.challengerChoice;
    const opponentChoice = game.opponentChoice;
    
    // Determine the winner
    let result;
    if (challengerChoice === opponentChoice) {
      result = 'tie';
    } else if (CHOICES[challengerChoice].beats.includes(opponentChoice)) {
      result = 'challenger';
    } else {
      result = 'opponent';
    }
    
    // Create the result embed
    const embed = new EmbedBuilder()
      .setTitle('🎮 Rock Paper Scissors Lizard Spock - Result!')
      .setColor(result === 'tie' ? '#f1c40f' : '#2ecc71')
      .addFields(
        { name: `${game.challenger.username}'s Choice`, value: `${CHOICES[challengerChoice].emoji} ${challengerChoice}`, inline: true },
        { name: `${game.opponent.username}'s Choice`, value: `${CHOICES[opponentChoice].emoji} ${opponentChoice}`, inline: true }
      )
      .setTimestamp();
    
    // Add the result text
    if (result === 'tie') {
      embed.setDescription('It\'s a tie! Both players chose the same move.');
    } else {
      const winner = result === 'challenger' ? game.challenger : game.opponent;
      const winnerChoice = result === 'challenger' ? challengerChoice : opponentChoice;
      const loserChoice = result === 'challenger' ? opponentChoice : challengerChoice;
      
      embed.setDescription(`${winner} wins!\n${CHOICES[winnerChoice].emoji} ${winnerChoice} beats ${CHOICES[loserChoice].emoji} ${loserChoice}`);
    }
    
    // Create a play again button
    const playAgainButton = new ButtonBuilder()
      .setCustomId(`rpsls:new_game:${interaction.user.id}`)
      .setLabel('Play Again')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🔄');
    
    const row = new ActionRowBuilder().addComponents(playAgainButton);
    
    // Try to update the original message
    try {
      // Find the original message where the game was being played
      const messages = await game.channel.messages.fetch({ limit: 10 });
      const gameMessage = messages.find(m => 
        m.author.bot && 
        m.embeds.length > 0 && 
        m.embeds[0].title && 
        m.embeds[0].title.includes('Rock Paper Scissors Lizard Spock')
      );
      
      if (gameMessage) {
        await gameMessage.edit({
          content: 'Game complete! Here are the results:',
          embeds: [embed],
          components: [row]
        });
      } else {
        // If can't find the original message, send a new one
        await game.channel.send({
          content: 'Game complete! Here are the results:',
          embeds: [embed],
          components: [row]
        });
      }
    } catch (error) {
      logger.error(`Error updating game results: ${error.message}`);
      // Send a new message as fallback
      await game.channel.send({
        content: 'Game complete! Here are the results:',
        embeds: [embed],
        components: [row]
      });
    }
    
    logger.info(`RPSLS game completed between ${game.challenger.tag} and ${game.opponent.tag}. Result: ${result}`);
  },
  
  /**
   * Create the buttons for making a choice
   * @param {string} gameId - The game ID
   * @returns {ActionRowBuilder} The row of buttons
   */
  createChoiceButtons(gameId) {
    const row = new ActionRowBuilder();
    
    // Create a button for each choice
    Object.entries(CHOICES).forEach(([choice, data]) => {
      const button = new ButtonBuilder()
        .setCustomId(`rpsls:choice:${gameId}:${choice}`)
        .setLabel(choice)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(data.emoji);
      
      row.addComponents(button);
    });
    
    return row;
  },
  
  /**
   * Play against the bot
   * @param {Interaction} interaction - The interaction
   */
  async playAgainstBot(interaction) {
    // Generate a random choice for the bot
    const choices = Object.keys(CHOICES);
    const botChoice = choices[Math.floor(Math.random() * choices.length)];
    
    // Create the game embed
    const embed = new EmbedBuilder()
      .setTitle('🎮 Rock Paper Scissors Lizard Spock vs. Bot')
      .setDescription('Choose your move to play against the bot!')
      .setColor(config.embedColor || '#3498db')
      .addFields(
        { name: 'How to Play', value: 'Rock crushes Scissors and Lizard\nPaper covers Rock and disproves Spock\nScissors cuts Paper and decapitates Lizard\nLizard eats Paper and poisons Spock\nSpock smashes Scissors and vaporizes Rock' }
      )
      .setFooter({ text: 'The bot has already made its choice' })
      .setTimestamp();
    
    // Create the choice buttons
    const row = new ActionRowBuilder();
    
    // Create a button for each choice
    Object.entries(CHOICES).forEach(([choice, data]) => {
      const button = new ButtonBuilder()
        .setCustomId(`rpsls:bot_choice:${botChoice}:${choice}`)
        .setLabel(choice)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(data.emoji);
      
      row.addComponents(button);
    });
    
    // Send the game
    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
    
    logger.info(`User ${interaction.user.tag} started RPSLS game against bot`);
  },
  
  /**
   * Handle a player's choice against the bot
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {string} botChoice - The bot's choice
   * @param {string} playerChoice - The player's choice
   */
  async handleBotGame(interaction, botChoice, playerChoice) {
    // Determine the winner
    let result;
    if (playerChoice === botChoice) {
      result = 'tie';
    } else if (CHOICES[playerChoice].beats.includes(botChoice)) {
      result = 'player';
    } else {
      result = 'bot';
    }
    
    // Create the result embed
    const embed = new EmbedBuilder()
      .setTitle('🎮 Rock Paper Scissors Lizard Spock vs. Bot - Result!')
      .setColor(result === 'tie' ? '#f1c40f' : (result === 'player' ? '#2ecc71' : '#e74c3c'))
      .addFields(
        { name: 'Your Choice', value: `${CHOICES[playerChoice].emoji} ${playerChoice}`, inline: true },
        { name: 'Bot\'s Choice', value: `${CHOICES[botChoice].emoji} ${botChoice}`, inline: true }
      )
      .setTimestamp();
    
    // Add the result text
    if (result === 'tie') {
      embed.setDescription('It\'s a tie! You and the bot chose the same move.');
    } else if (result === 'player') {
      embed.setDescription(`You win!\n${CHOICES[playerChoice].emoji} ${playerChoice} beats ${CHOICES[botChoice].emoji} ${botChoice}`);
    } else {
      embed.setDescription(`Bot wins!\n${CHOICES[botChoice].emoji} ${botChoice} beats ${CHOICES[playerChoice].emoji} ${playerChoice}`);
    }
    
    // Create a play again button
    const playAgainButton = new ButtonBuilder()
      .setCustomId('rpsls:play_again')
      .setLabel('Play Again')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🔄');
    
    const row = new ActionRowBuilder().addComponents(playAgainButton);
    
    // Update the message
    await interaction.update({
      embeds: [embed],
      components: [row]
    });
    
    logger.info(`User ${interaction.user.tag} played RPSLS against bot. Result: ${result}`);
  }
};