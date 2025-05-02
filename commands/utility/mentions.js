const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config.json');
const fs = require('fs');
const path = require('path');

// Map to track recent mentions (in-memory storage, resets on bot restart)
// Format: { guildId: { userId: { mentionedBy: { userId: count }, totalReceived: number } } }
const mentionsCache = new Map();

// Path to the mentions data file
const MENTIONS_FILE = path.join(__dirname, '..', '..', 'data', 'mentions.json');

// Load mentions data from file
function loadMentionsData() {
  try {
    if (fs.existsSync(MENTIONS_FILE)) {
      const data = fs.readFileSync(MENTIONS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      
      // Convert the plain object to a Map
      Object.keys(parsed).forEach(guildId => {
        mentionsCache.set(guildId, parsed[guildId]);
      });
      
      logger.info('Loaded mentions data from file');
    } else {
      logger.info('No mentions data file found, creating a new one');
      saveMentionsData();
    }
  } catch (error) {
    logger.error(`Error loading mentions data: ${error.message}`);
  }
}

// Save mentions data to file
function saveMentionsData() {
  try {
    const data = {};
    
    // Convert the Map to a plain object for JSON serialization
    mentionsCache.forEach((guildData, guildId) => {
      data[guildId] = guildData;
    });
    
    // Ensure directory exists
    const dataDir = path.dirname(MENTIONS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(MENTIONS_FILE, JSON.stringify(data, null, 2));
    logger.info('Saved mentions data to file');
  } catch (error) {
    logger.error(`Error saving mentions data: ${error.message}`);
  }
}

// Track a mention
function trackMention(guildId, mentionedUserId, mentionerUserId) {
  // Skip self-mentions
  if (mentionedUserId === mentionerUserId) return;
  
  // Initialize guild data if it doesn't exist
  if (!mentionsCache.has(guildId)) {
    mentionsCache.set(guildId, {});
  }
  
  const guildData = mentionsCache.get(guildId);
  
  // Initialize user data if it doesn't exist
  if (!guildData[mentionedUserId]) {
    guildData[mentionedUserId] = {
      mentionedBy: {},
      totalReceived: 0
    };
  }
  
  const userData = guildData[mentionedUserId];
  
  // Initialize mentioner data if it doesn't exist
  if (!userData.mentionedBy[mentionerUserId]) {
    userData.mentionedBy[mentionerUserId] = 0;
  }
  
  // Increment mention count
  userData.mentionedBy[mentionerUserId]++;
  userData.totalReceived++;
  
  // Save data periodically (could optimize to save less frequently in production)
  saveMentionsData();
}

// Initialize by loading data
loadMentionsData();

// Listen for mentions in messages
function processMentionsInMessage(message) {
  if (!message.guild || message.author.bot) return;
  
  // Get all user mentions in the message
  const mentionedUsers = Array.from(message.mentions.users.values());
  
  if (mentionedUsers.length > 0) {
    const guildId = message.guild.id;
    const mentionerId = message.author.id;
    
    mentionedUsers.forEach(user => {
      trackMention(guildId, user.id, mentionerId);
    });
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mentions')
    .setDescription('Track and view user mentions')
    .addSubcommand(subcommand =>
      subcommand
        .setName('check')
        .setDescription('Check who mentioned a user the most')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to check mentions for')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('limit')
            .setDescription('Number of top mentioners to show (default: 5)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(25)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('leaderboard')
        .setDescription('See who has been mentioned the most')
        .addIntegerOption(option =>
          option.setName('limit')
            .setDescription('Number of users to show (default: 10)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(25)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ViewChannel),
  
  cooldown: 10,
  
  // Export the message processor for use in the messageCreate event
  processMentionsInMessage,
  
  /**
   * Executes the mentions command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'check') {
      await this.checkMentions(interaction);
    } else if (subcommand === 'leaderboard') {
      await this.showLeaderboard(interaction);
    }
  },
  
  /**
   * Check who mentioned a user the most
   * @param {Interaction} interaction - The interaction
   */
  async checkMentions(interaction) {
    await interaction.deferReply();
    
    try {
      const targetUser = interaction.options.getUser('user');
      const limit = interaction.options.getInteger('limit') || 5;
      const guildId = interaction.guild.id;
      
      // Get guild data
      const guildData = mentionsCache.get(guildId) || {};
      
      // Get user data
      const userData = guildData[targetUser.id] || { mentionedBy: {}, totalReceived: 0 };
      
      // Create sorted list of mentioners
      const mentioners = Object.entries(userData.mentionedBy)
        .sort((a, b) => b[1] - a[1]) // Sort by count, descending
        .slice(0, limit); // Limit to the specified number
      
      const embed = new EmbedBuilder()
        .setTitle(`Mention Stats for ${targetUser.tag}`)
        .setColor(config.embedColor || '#3498db')
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setDescription(`${targetUser} has been mentioned **${userData.totalReceived}** times.`)
        .setFooter({ text: 'Mention tracking since bot was added' })
        .setTimestamp();
      
      if (mentioners.length > 0) {
        // Format the mentioners list
        const mentionersList = await Promise.all(mentioners.map(async ([userId, count]) => {
          try {
            const user = await interaction.client.users.fetch(userId);
            return `${user}: **${count}** times`;
          } catch (e) {
            return `Unknown User (${userId}): **${count}** times`;
          }
        }));
        
        embed.addFields({
          name: 'Top Mentioners',
          value: mentionersList.join('\n') || 'No one has mentioned this user yet.'
        });
      } else {
        embed.addFields({
          name: 'Top Mentioners',
          value: 'No one has mentioned this user yet.'
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
      logger.info(`User ${interaction.user.tag} checked mentions for ${targetUser.tag}`);
    } catch (error) {
      logger.error(`Error checking mentions: ${error.message}`);
      await interaction.editReply('An error occurred while fetching mention data.');
    }
  },
  
  /**
   * Show the most mentioned users
   * @param {Interaction} interaction - The interaction
   */
  async showLeaderboard(interaction) {
    await interaction.deferReply();
    
    try {
      const limit = interaction.options.getInteger('limit') || 10;
      const guildId = interaction.guild.id;
      
      // Get guild data
      const guildData = mentionsCache.get(guildId) || {};
      
      // Create a sorted list of users by total mentions
      const userMentions = Object.entries(guildData)
        .map(([userId, data]) => ({
          userId,
          totalMentions: data.totalReceived
        }))
        .sort((a, b) => b.totalMentions - a.totalMentions) // Sort by total mentions, descending
        .slice(0, limit); // Limit to the specified number
      
      const embed = new EmbedBuilder()
        .setTitle('Most Mentioned Users')
        .setColor(config.embedColor || '#3498db')
        .setDescription(`The top ${limit} most mentioned users in this server.`)
        .setFooter({ text: 'Mention tracking since bot was added' })
        .setTimestamp();
      
      if (userMentions.length > 0) {
        // Format the users list
        const usersList = await Promise.all(userMentions.map(async (entry, index) => {
          try {
            const user = await interaction.client.users.fetch(entry.userId);
            return `${index + 1}. ${user}: **${entry.totalMentions}** mentions`;
          } catch (e) {
            return `${index + 1}. Unknown User (${entry.userId}): **${entry.totalMentions}** mentions`;
          }
        }));
        
        embed.addFields({
          name: 'Leaderboard',
          value: usersList.join('\n') || 'No mention data available.'
        });
      } else {
        embed.addFields({
          name: 'Leaderboard',
          value: 'No mention data available yet.'
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
      logger.info(`User ${interaction.user.tag} viewed the mentions leaderboard`);
    } catch (error) {
      logger.error(`Error showing mentions leaderboard: ${error.message}`);
      await interaction.editReply('An error occurred while fetching the mentions leaderboard.');
    }
  }
};