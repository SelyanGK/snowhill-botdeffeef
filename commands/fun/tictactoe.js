const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

// Map to track active games (key: gameId, value: game state)
const activeGames = new Map();

// Symbols for players
const SYMBOLS = {
  X: '❌',
  O: '⭕',
  EMPTY: '⬜'
};

// Game states
const GAME_STATES = {
  WAITING_FOR_PLAYER: 'waiting_for_player',
  ACTIVE: 'active',
  FINISHED: 'finished'
};

// Clean up inactive games periodically
setInterval(() => {
  const now = Date.now();
  let expiredGames = 0;
  
  activeGames.forEach((game, gameId) => {
    // Remove games inactive for over 10 minutes
    if (now - game.lastActivityTime > 10 * 60 * 1000) {
      activeGames.delete(gameId);
      expiredGames++;
    }
  });
  
  if (expiredGames > 0) {
    logger.info(`Cleaned up ${expiredGames} inactive tic-tac-toe games`);
  }
}, 5 * 60 * 1000); // Check every 5 minutes

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tictactoe')
    .setDescription('Start a game of Tic Tac Toe')
    .addUserOption(option =>
      option.setName('opponent')
        .setDescription('The user to play against')
        .setRequired(false)),
  
  cooldown: 10,
  
  /**
   * Creates a new tic tac toe game
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    // Clean up any stale game references first
    const now = Date.now();
    let expiredGames = 0;
    
    activeGames.forEach((game, gameId) => {
      // Remove games inactive for over 10 minutes
      if (now - game.lastActivityTime > 10 * 60 * 1000) {
        activeGames.delete(gameId);
        expiredGames++;
      }
    });
    
    if (expiredGames > 0) {
      logger.info(`Cleaned up ${expiredGames} inactive tic-tac-toe games`);
    }
    
    // Check if user has an active game (after cleanup)
    const userGames = Array.from(activeGames.values())
      .filter(game => 
        game.state !== GAME_STATES.FINISHED && 
        (game.players.x === interaction.user.id || game.players.o === interaction.user.id));
    
    if (userGames.length > 0) {
      return interaction.reply({ 
        content: 'You already have an active Tic Tac Toe game. Please finish it before starting a new one.',
        ephemeral: true 
      });
    }
    
    // Get opponent (if specified)
    const opponent = interaction.options.getUser('opponent');
    
    // Generate game ID
    const gameId = generateGameId();
    
    // Create new game
    const game = {
      id: gameId,
      board: Array(9).fill(null),
      currentTurn: 'x',  // X goes first
      players: {
        x: interaction.user.id,
        o: opponent ? opponent.id : null
      },
      state: opponent ? GAME_STATES.ACTIVE : GAME_STATES.WAITING_FOR_PLAYER,
      createdAt: Date.now(),
      lastActivityTime: Date.now(),
      channel: interaction.channelId,
      thread: null, // Will be set if we create a thread
      moves: 0 // Count moves to optimize win checking
    };
    
    // Store the game
    activeGames.set(gameId, game);
    
    // Create the game board message
    const embed = createGameEmbed(game, interaction);
    const components = createGameComponents(game);
    
    // Send response
    await interaction.reply({
      embeds: [embed],
      components: components
    });
    
    logger.info(`User ${interaction.user.tag} (${interaction.user.id}) started a new Tic Tac Toe game${opponent ? ` against ${opponent.tag}` : ''}`);
  },
  
  /**
   * Handles button interactions for the game
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {string} gameId - The game ID
   * @param {string} action - The button action
   * @param {string} position - The board position (0-8)
   */
  async handleTicTacToeInteraction(interaction, gameId, action, position) {
    // Fetch the game
    const game = activeGames.get(gameId);
    
    // Game doesn't exist or is finished
    if (!game) {
      return interaction.reply({ 
        content: 'This game no longer exists or has expired.',
        ephemeral: true 
      });
    }
    
    // Update last activity time
    game.lastActivityTime = Date.now();
    
    // Handle joining an open game
    if (action === 'join' && game.state === GAME_STATES.WAITING_FOR_PLAYER) {
      return this.handleJoinGame(interaction, game);
    }
    
    // Handle placing a move
    if (action === 'move' && game.state === GAME_STATES.ACTIVE) {
      return this.handleGameMove(interaction, game, position);
    }
    
    // Handle resigning/cancelling a game
    if (action === 'resign') {
      return this.handleResignGame(interaction, game);
    }
    
    // Invalid action
    return interaction.reply({ 
      content: 'Invalid action or the game is not in the right state.',
      ephemeral: true 
    });
  },
  
  /**
   * Handles a player joining an open game
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {Object} game - The game state
   */
  async handleJoinGame(interaction, game) {
    // Check if the user is already the creator
    if (interaction.user.id === game.players.x) {
      return interaction.reply({ 
        content: 'You cannot play against yourself.',
        ephemeral: true 
      });
    }
    
    // Update the game to have the second player and set to active
    game.players.o = interaction.user.id;
    game.state = GAME_STATES.ACTIVE;
    game.lastActivityTime = Date.now();
    
    // Create updated embed and components
    const embed = createGameEmbed(game, interaction);
    const components = createGameComponents(game);
    
    // Update the message
    await interaction.update({
      embeds: [embed],
      components: components
    });
    
    logger.info(`User ${interaction.user.tag} (${interaction.user.id}) joined a Tic Tac Toe game`);
  },
  
  /**
   * Handles a player making a move
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {Object} game - The game state
   * @param {string} position - The board position (0-8)
   */
  async handleGameMove(interaction, game, position) {
    // Convert position to number
    const pos = parseInt(position, 10);
    
    // Check valid position
    if (pos < 0 || pos > 8 || isNaN(pos)) {
      return interaction.reply({ 
        content: 'Invalid position.',
        ephemeral: true 
      });
    }
    
    // Check if the position is already taken
    if (game.board[pos] !== null) {
      return interaction.reply({ 
        content: 'That position is already taken. Please choose another.',
        ephemeral: true 
      });
    }
    
    // Check if it's the user's turn
    const playerSymbol = game.players.x === interaction.user.id ? 'x' : 
                        (game.players.o === interaction.user.id ? 'o' : null);
    
    if (!playerSymbol) {
      return interaction.reply({ 
        content: 'You are not part of this game.',
        ephemeral: true 
      });
    }
    
    if (game.currentTurn !== playerSymbol) {
      return interaction.reply({ 
        content: "It's not your turn.",
        ephemeral: true 
      });
    }
    
    // Update the board
    game.board[pos] = playerSymbol;
    game.moves++;
    game.lastActivityTime = Date.now();
    
    // Check for win or draw
    const winner = checkForWin(game);
    if (winner) {
      game.state = GAME_STATES.FINISHED;
      game.winner = winner;
    } else if (game.moves >= 9) {
      game.state = GAME_STATES.FINISHED;
      game.winner = 'draw';
    } else {
      // Switch turns
      game.currentTurn = game.currentTurn === 'x' ? 'o' : 'x';
    }
    
    // Create updated embed and components
    const embed = createGameEmbed(game, interaction);
    const components = createGameComponents(game);
    
    // Update the message
    await interaction.update({
      embeds: [embed],
      components: components
    });
    
    if (game.state === GAME_STATES.FINISHED) {
      // Log game completion
      const resultMessage = game.winner === 'draw' ? 
        'The game ended in a draw' : 
        `Player ${game.winner === 'x' ? '<X>' : '<O>'} won the game`;
        
      logger.info(`Tic Tac Toe game ${game.id} finished: ${resultMessage}`);
      
      // Remove game from active games after a delay to allow viewing
      setTimeout(() => {
        activeGames.delete(game.id);
      }, 5 * 60 * 1000); // Keep finished games for 5 minutes
    }
  },
  
  /**
   * Handles a player resigning/cancelling a game
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {Object} game - The game state
   */
  async handleResignGame(interaction, game) {
    // Check if user is part of the game
    const isPlayerX = game.players.x === interaction.user.id;
    const isPlayerO = game.players.o === interaction.user.id;
    
    if (!isPlayerX && !isPlayerO) {
      return interaction.reply({ 
        content: 'You are not part of this game.',
        ephemeral: true 
      });
    }
    
    // If game is waiting for a player, just mark it as finished
    if (game.state === GAME_STATES.WAITING_FOR_PLAYER) {
      game.state = GAME_STATES.FINISHED;
      game.winner = 'cancelled';
    } else {
      // If game is active, the other player wins
      game.state = GAME_STATES.FINISHED;
      game.winner = isPlayerX ? 'o' : 'x';
    }
    
    // Create updated embed and components
    const embed = createGameEmbed(game, interaction);
    const components = [];
    
    // Update the message
    await interaction.update({
      embeds: [embed],
      components: components
    });
    
    logger.info(`User ${interaction.user.tag} (${interaction.user.id}) resigned from a Tic Tac Toe game`);
    
    // Remove game from active games
    activeGames.delete(game.id);
  }
};

/**
 * Creates an embed displaying the game state
 * @param {Object} game - The game state
 * @param {Interaction} interaction - The interaction for fetching users
 * @returns {EmbedBuilder} The game embed
 */
function createGameEmbed(game, interaction) {
  const embed = new EmbedBuilder()
    .setTitle('Tic Tac Toe')
    .setColor(config.embedColor)
    .setTimestamp();
  
  // Add the board visualization
  const boardVisualization = renderGameBoard(game.board);
  embed.setDescription(boardVisualization);
  
  // Add game info
  const xUser = interaction.client.users.cache.get(game.players.x);
  const oUser = game.players.o ? interaction.client.users.cache.get(game.players.o) : null;
  
  const xDisplay = xUser ? `${SYMBOLS.X} ${xUser.username}` : `${SYMBOLS.X} Unknown User`;
  const oDisplay = oUser ? `${SYMBOLS.O} ${oUser.username}` : `${SYMBOLS.O} Waiting for player...`;
  
  embed.addFields(
    { name: 'Players', value: `${xDisplay}\n${oDisplay}`, inline: true }
  );
  
  // Show game status
  if (game.state === GAME_STATES.FINISHED) {
    let statusMessage;
    if (game.winner === 'draw') {
      statusMessage = "It's a draw!";
    } else if (game.winner === 'cancelled') {
      statusMessage = "Game was cancelled.";
    } else {
      const winnerUser = game.winner === 'x' ? xUser : oUser;
      statusMessage = `${winnerUser ? winnerUser.username : 'Unknown User'} wins!`;
    }
    embed.addFields({ name: 'Status', value: statusMessage, inline: true });
  } else {
    const currentPlayer = game.currentTurn === 'x' ? xUser : oUser;
    const turnMessage = game.state === GAME_STATES.WAITING_FOR_PLAYER ? 
      'Waiting for an opponent to join...' : 
      `${currentPlayer ? currentPlayer.username : 'Unknown User'}'s turn ${game.currentTurn === 'x' ? SYMBOLS.X : SYMBOLS.O}`;
    
    embed.addFields({ name: 'Status', value: turnMessage, inline: true });
  }
  
  // Add footer with game ID for tracking
  embed.setFooter({ text: `Game ID: ${game.id}` });
  
  return embed;
}

/**
 * Creates the button components for the game
 * @param {Object} game - The game state
 * @returns {ActionRowBuilder[]} Array of button rows
 */
function createGameComponents(game) {
  // If game is finished, return empty components
  if (game.state === GAME_STATES.FINISHED) {
    return [];
  }
  
  if (game.state === GAME_STATES.WAITING_FOR_PLAYER) {
    // Create a join button for open games
    const joinButton = new ButtonBuilder()
      .setCustomId(`ttt:${game.id}:join:0`)
      .setLabel('Join Game')
      .setStyle(ButtonStyle.Success);
      
    const cancelButton = new ButtonBuilder()
      .setCustomId(`ttt:${game.id}:resign:0`)
      .setLabel('Cancel Game')
      .setStyle(ButtonStyle.Danger);
    
    const row = new ActionRowBuilder().addComponents(joinButton, cancelButton);
    return [row];
  }
  
  // Create the game board buttons
  const rows = [];
  for (let i = 0; i < 3; i++) {
    const row = new ActionRowBuilder();
    
    for (let j = 0; j < 3; j++) {
      const position = i * 3 + j;
      const value = game.board[position];
      
      const button = new ButtonBuilder()
        .setCustomId(`ttt:${game.id}:move:${position}`)
        .setStyle(value === null ? ButtonStyle.Secondary : (value === 'x' ? ButtonStyle.Danger : ButtonStyle.Primary));
      
      // Set label/emoji based on the value
      if (value === 'x') {
        button.setLabel('X');
        button.setDisabled(true);
      } else if (value === 'o') {
        button.setLabel('O');
        button.setDisabled(true);
      } else {
        // Empty space needs a visible character as Discord API requires non-empty labels
        button.setLabel('·');
      }
      
      row.addComponents(button);
    }
    
    rows.push(row);
  }
  
  // Add a resign button
  const resignButton = new ButtonBuilder()
    .setCustomId(`ttt:${game.id}:resign:0`)
    .setLabel('Resign')
    .setStyle(ButtonStyle.Danger);
  
  const controlRow = new ActionRowBuilder().addComponents(resignButton);
  rows.push(controlRow);
  
  return rows;
}

/**
 * Renders the game board as a string
 * @param {Array} board - The game board array
 * @returns {string} Formatted board string
 */
function renderGameBoard(board) {
  let result = '';
  
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const position = i * 3 + j;
      const value = board[position];
      
      if (value === 'x') {
        result += SYMBOLS.X;
      } else if (value === 'o') {
        result += SYMBOLS.O;
      } else {
        result += SYMBOLS.EMPTY;
      }
    }
    result += '\n';
  }
  
  return result;
}

/**
 * Checks if there's a winner
 * @param {Object} game - The game state
 * @returns {string|null} The winner ('x' or 'o') or null if no winner
 */
function checkForWin(game) {
  const board = game.board;
  
  // Don't check for wins until at least 5 moves have been made
  // (minimum needed for a win)
  if (game.moves < 5) return null;
  
  // Check rows
  for (let i = 0; i < 3; i++) {
    const rowStart = i * 3;
    if (board[rowStart] && board[rowStart] === board[rowStart + 1] && board[rowStart] === board[rowStart + 2]) {
      return board[rowStart];
    }
  }
  
  // Check columns
  for (let i = 0; i < 3; i++) {
    if (board[i] && board[i] === board[i + 3] && board[i] === board[i + 6]) {
      return board[i];
    }
  }
  
  // Check diagonals
  if (board[0] && board[0] === board[4] && board[0] === board[8]) {
    return board[0];
  }
  
  if (board[2] && board[2] === board[4] && board[2] === board[6]) {
    return board[2];
  }
  
  return null;
}

/**
 * Generates a unique game ID
 * @returns {string} A unique game ID
 */
function generateGameId() {
  return Math.random().toString(36).substring(2, 9);
}
