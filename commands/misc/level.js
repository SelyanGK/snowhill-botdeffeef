const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');
const Database = require('../../utils/database');

// Levels database
const levelsDb = new Database('levels.json');

// XP constants
const BASE_XP = 15;
const XP_RANDOMNESS = 10;
const XP_COOLDOWN = 60 * 1000; // 1 minute cooldown between XP gains

// Level up formula: level = sqrt(xp / 100)
const calculateLevel = (xp) => Math.floor(Math.sqrt(xp / 100));
const calculateXpForLevel = (level) => level * level * 100;

// Message XP tracking - userId:timestamp
const lastMessageTimestamp = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Check your level or another user\'s level')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to check the level of')
        .setRequired(false)),
  
  cooldown: 5,
  
  /**
   * Executes the level command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Get target user (either mentioned or command user)
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      
      if (!targetMember) {
        return interaction.editReply('Could not find that user in this server.');
      }
      
      // Get level data
      const guildId = interaction.guild.id;
      const userId = targetUser.id;
      
      const levelData = this.getUserLevelData(guildId, userId);
      const currentLevel = calculateLevel(levelData.xp);
      const nextLevelXp = calculateXpForLevel(currentLevel + 1);
      
      // Calculate progress to next level
      const currentLevelXp = calculateXpForLevel(currentLevel);
      const xpProgress = levelData.xp - currentLevelXp;
      const xpNeeded = nextLevelXp - currentLevelXp;
      const progressPercentage = Math.floor((xpProgress / xpNeeded) * 100);
      
      // Generate progress bar
      const progressBar = this.generateProgressBar(progressPercentage);
      
      // Format numbers with commas
      const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      
      // Get rank (position in server)
      const rank = this.getUserRank(guildId, userId);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`${targetUser.username}'s Level`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .setColor(config.embedColor)
        .addFields(
          { name: 'Level', value: `${currentLevel}`, inline: true },
          { name: 'Rank', value: `#${rank}`, inline: true },
          { name: 'Total XP', value: `${formatNumber(levelData.xp)}`, inline: true },
          { name: `Progress to Level ${currentLevel + 1}`, value: `${progressBar}\n${formatNumber(xpProgress)}/${formatNumber(xpNeeded)} XP (${progressPercentage}%)` }
        )
        .setFooter({ text: `Messages: ${formatNumber(levelData.messages)}` })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      logger.info(`User ${interaction.user.tag} checked level for ${targetUser.tag}`);
    } catch (error) {
      logger.error(`Error executing level command: ${error.message}`);
      await interaction.editReply('An error occurred while checking the level information.');
    }
  },
  
  /**
   * Gets a user's level data, creating an entry if it doesn't exist
   * @param {string} guildId - The guild ID
   * @param {string} userId - The user ID
   * @returns {Object} The user's level data
   */
  getUserLevelData(guildId, userId) {
    const levelData = levelsDb.read() || {};
    
    // Initialize guild data if it doesn't exist
    if (!levelData[guildId]) {
      levelData[guildId] = { users: {} };
    }
    
    // Initialize user data if it doesn't exist
    if (!levelData[guildId].users[userId]) {
      levelData[guildId].users[userId] = {
        xp: 0,
        messages: 0,
        lastLevelUp: null
      };
      
      levelsDb.write(levelData);
    }
    
    return levelData[guildId].users[userId];
  },
  
  /**
   * Gets a user's rank in the server
   * @param {string} guildId - The guild ID
   * @param {string} userId - The user ID
   * @returns {number} The user's rank
   */
  getUserRank(guildId, userId) {
    const levelData = levelsDb.read() || {};
    
    if (!levelData[guildId] || !levelData[guildId].users) {
      return 1; // If no data exists, user is rank 1
    }
    
    // Create an array of users sorted by XP
    const usersArray = Object.entries(levelData[guildId].users)
      .map(([id, data]) => ({ id, xp: data.xp }))
      .sort((a, b) => b.xp - a.xp);
    
    // Find the user's position in the array
    const userIndex = usersArray.findIndex(user => user.id === userId);
    
    return userIndex === -1 ? usersArray.length + 1 : userIndex + 1;
  },
  
  /**
   * Generates a progress bar
   * @param {number} percentage - The percentage (0-100)
   * @returns {string} A progress bar
   */
  generateProgressBar(percentage) {
    const filledChar = '█';
    const emptyChar = '░';
    const barLength = 20;
    
    const filledLength = Math.round((percentage / 100) * barLength);
    const emptyLength = barLength - filledLength;
    
    return filledChar.repeat(filledLength) + emptyChar.repeat(emptyLength);
  },
  
  /**
   * Handles message XP when a user sends a message
   * @param {Message} message - The message object
   */
  handleMessageXp(message) {
    // Ignore bots, DMs, webhook messages
    if (message.author.bot || !message.guild || message.webhookId) return;
    
    const userId = message.author.id;
    const guildId = message.guild.id;
    
    // Check if user is on cooldown
    const now = Date.now();
    const lastTime = lastMessageTimestamp.get(userId) || 0;
    
    if (now - lastTime < XP_COOLDOWN) {
      return; // User is on cooldown
    }
    
    // User is not on cooldown, grant XP
    lastMessageTimestamp.set(userId, now);
    
    // Get random XP amount (BASE_XP ± XP_RANDOMNESS)
    const xpGain = BASE_XP + Math.floor(Math.random() * (XP_RANDOMNESS * 2 + 1)) - XP_RANDOMNESS;
    
    // Get current user data
    const userData = this.getUserLevelData(guildId, userId);
    const oldLevel = calculateLevel(userData.xp);
    
    // Update XP and message count
    userData.xp += xpGain;
    userData.messages++;
    
    // Calculate new level
    const newLevel = calculateLevel(userData.xp);
    
    // Save updated data
    const levelData = levelsDb.read();
    levelData[guildId].users[userId] = userData;
    levelsDb.write(levelData);
    
    // Check for level up
    if (newLevel > oldLevel) {
      // Send level up message
      try {
        const embed = new EmbedBuilder()
          .setTitle(`🎉 Level Up!`)
          .setDescription(`Congratulations <@${userId}>, you've reached **Level ${newLevel}**!`)
          .setColor(config.embedColor)
          .setFooter({ text: `Keep chatting to earn more XP!` });
        
        message.channel.send({ embeds: [embed] }).catch(() => {});
        
        // Update last level up timestamp
        userData.lastLevelUp = Date.now();
        levelData[guildId].users[userId] = userData;
        levelsDb.write(levelData);
        
        logger.info(`User ${message.author.tag} leveled up to level ${newLevel}`);
      } catch (error) {
        logger.error(`Error sending level up message: ${error.message}`);
      }
    }
  }
};
