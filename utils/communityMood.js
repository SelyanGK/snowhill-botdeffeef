const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Path to the community mood data file
const MOOD_FILE = path.join(__dirname, '..', 'data', 'community_mood.json');

// Emoji categorization for mood analysis
const POSITIVE_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😊', '🙂', '😎', '🥰', '😍', '🤩', '😇', '👍', '❤️', '🧡', '💛', '💚', '💙', '💜',
  '🥳', '🎉', '🎊', '🎈', '✨', '⭐', '🌟', '💯', '🔥', '🙌', '👏', '💪', '🤗', '🥺'
];

const NEGATIVE_EMOJIS = [
  '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '👎',
  '😱', '😨', '😰', '😥', '😓', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '💔', '🤔', '🤨', '😐', '😑', '😬'
];

// Initialization timestamp
const INIT_TIME = Date.now();

/**
 * Community Mood tracking utility
 */
class CommunityMood {
  constructor() {
    this.data = this.loadData();
    this.initializeIfNeeded();
    
    // Set up auto-saving every 5 minutes
    setInterval(() => this.saveData(), 5 * 60 * 1000);
  }
  
  /**
   * Initialize mood data if it's first run or reset periods based on time
   */
  initializeIfNeeded() {
    const now = Date.now();
    
    // Initialize if this is the first run
    if (!this.data.lastUpdated) {
      this.data.lastUpdated = now;
      this.saveData();
      return;
    }
    
    // Check if we need to reset hourly data (every hour)
    const hourlyReset = 60 * 60 * 1000; // 1 hour in milliseconds
    if (now - this.data.lastUpdated > hourlyReset) {
      this.data.engagement.hourly = {
        messageCount: 0,
        reactionCount: 0,
        uniqueUsers: []
      };
    }
    
    // Check if we need to reset daily data (every 24 hours)
    const dailyReset = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    if (now - this.data.lastUpdated > dailyReset) {
      this.data.engagement.daily = {
        messageCount: 0,
        reactionCount: 0,
        uniqueUsers: []
      };
    }
    
    // Check if we need to reset weekly data (every 7 days)
    const weeklyReset = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    if (now - this.data.lastUpdated > weeklyReset) {
      this.data.engagement.weekly = {
        messageCount: 0,
        reactionCount: 0,
        uniqueUsers: []
      };
      
      // Also reset mood data on weekly reset
      this.data.mood = {
        positiveEmojis: 0,
        negativeEmojis: 0,
        neutralEmojis: 0
      };
    }
    
    // Update the last updated timestamp
    this.data.lastUpdated = now;
    this.saveData();
  }
  
  /**
   * Loads mood data from file
   * @returns {Object} Mood data object
   */
  loadData() {
    try {
      if (fs.existsSync(MOOD_FILE)) {
        const data = fs.readFileSync(MOOD_FILE, 'utf8');
        return JSON.parse(data);
      } else {
        // If file doesn't exist, return default structure
        return {
          lastUpdated: INIT_TIME,
          engagement: {
            hourly: { messageCount: 0, reactionCount: 0, uniqueUsers: [] },
            daily: { messageCount: 0, reactionCount: 0, uniqueUsers: [] },
            weekly: { messageCount: 0, reactionCount: 0, uniqueUsers: [] }
          },
          mood: {
            positiveEmojis: 0,
            negativeEmojis: 0,
            neutralEmojis: 0
          },
          activityLevel: "Low",
          moodLevel: "Neutral"
        };
      }
    } catch (error) {
      logger.error(`Error loading community mood data: ${error.message}`);
      return {
        lastUpdated: INIT_TIME,
        engagement: {
          hourly: { messageCount: 0, reactionCount: 0, uniqueUsers: [] },
          daily: { messageCount: 0, reactionCount: 0, uniqueUsers: [] },
          weekly: { messageCount: 0, reactionCount: 0, uniqueUsers: [] }
        },
        mood: {
          positiveEmojis: 0,
          negativeEmojis: 0,
          neutralEmojis: 0
        },
        activityLevel: "Low",
        moodLevel: "Neutral"
      };
    }
  }
  
  /**
   * Saves mood data to file
   */
  saveData() {
    try {
      // Ensure the directory exists
      const dir = path.dirname(MOOD_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Calculate derived values before saving
      this.calculateActivityLevel();
      this.calculateMoodLevel();
      
      fs.writeFileSync(MOOD_FILE, JSON.stringify(this.data, null, 2));
    } catch (error) {
      logger.error(`Error saving community mood data: ${error.message}`);
    }
  }
  
  /**
   * Tracks a new message for the mood system
   * @param {Message} message - The message to track
   */
  trackMessage(message) {
    try {
      // Skip bot messages and system messages
      if (message.author.bot || message.system) return;
      
      // Skip messages that are empty or only contain attachments/embeds
      if (!message.content || message.content.trim() === '') return;
      
      // Skip webhook messages
      if (message.webhookId) return;
      
      // Check if this is a valid server channel (not DM)
      if (!message.guild || !message.channel) return;
      
      // Check if we need to initialize/reset based on time periods
      this.initializeIfNeeded();
      
      // Log for debugging
      logger.debug(`Tracking message from ${message.author.tag} in #${message.channel.name}: "${message.content.substring(0, 20)}${message.content.length > 20 ? '...' : ''}"`);
      
      // Increment message counts
      this.data.engagement.hourly.messageCount++;
      this.data.engagement.daily.messageCount++;
      this.data.engagement.weekly.messageCount++;
      
      // Add the user to unique users lists if not already there
      const userId = message.author.id;
      
      if (!this.data.engagement.hourly.uniqueUsers.includes(userId)) {
        this.data.engagement.hourly.uniqueUsers.push(userId);
      }
      
      if (!this.data.engagement.daily.uniqueUsers.includes(userId)) {
        this.data.engagement.daily.uniqueUsers.push(userId);
      }
      
      if (!this.data.engagement.weekly.uniqueUsers.includes(userId)) {
        this.data.engagement.weekly.uniqueUsers.push(userId);
      }
      
      // Analysis for emojis in the message content
      this.analyzeEmojiContent(message.content);
      
      // Save the updated data
      this.saveData();
    } catch (error) {
      logger.error(`Error tracking message for mood: ${error.message}`);
    }
  }
  
  /**
   * Tracks a reaction for the mood system
   * @param {MessageReaction} reaction - The reaction to track
   * @param {User} user - The user who reacted
   */
  trackReaction(reaction, user) {
    try {
      // Skip bot reactions
      if (user.bot) return;
      
      // Check if we need to initialize/reset based on time periods
      this.initializeIfNeeded();
      
      // Increment reaction counts
      this.data.engagement.hourly.reactionCount++;
      this.data.engagement.daily.reactionCount++;
      this.data.engagement.weekly.reactionCount++;
      
      // Analyze the emoji for mood
      const emoji = reaction.emoji.name;
      
      if (POSITIVE_EMOJIS.includes(emoji)) {
        this.data.mood.positiveEmojis++;
      } else if (NEGATIVE_EMOJIS.includes(emoji)) {
        this.data.mood.negativeEmojis++;
      } else {
        this.data.mood.neutralEmojis++;
      }
      
      // Save the updated data
      this.saveData();
    } catch (error) {
      logger.error(`Error tracking reaction for mood: ${error.message}`);
    }
  }
  
  /**
   * Analyzes emojis in a message content
   * @param {string} content - Message content to analyze
   */
  analyzeEmojiContent(content) {
    try {
      // Basic emoji extraction regex
      const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
      const emojis = content.match(emojiRegex) || [];
      
      // Categorize the emojis
      emojis.forEach(emoji => {
        if (POSITIVE_EMOJIS.includes(emoji)) {
          this.data.mood.positiveEmojis++;
        } else if (NEGATIVE_EMOJIS.includes(emoji)) {
          this.data.mood.negativeEmojis++;
        } else {
          this.data.mood.neutralEmojis++;
        }
      });
    } catch (error) {
      logger.error(`Error analyzing emoji content: ${error.message}`);
    }
  }
  
  /**
   * Calculates the current activity level based on engagement metrics
   */
  calculateActivityLevel() {
    try {
      const hourlyData = this.data.engagement.hourly;
      
      // Added additional logging to help troubleshoot
      logger.debug(`Activity calculation - Messages: ${hourlyData.messageCount}, ` + 
                  `Reactions: ${hourlyData.reactionCount}, ` + 
                  `Unique Users: ${hourlyData.uniqueUsers.length}`);
      
      const hourlyScore = 
        hourlyData.messageCount + 
        (hourlyData.reactionCount * 0.5) + 
        (hourlyData.uniqueUsers.length * 2);
      
      // Define thresholds for activity levels with more reasonable values
      if (hourlyScore > 50) {
        this.data.activityLevel = 'Very High';
      } else if (hourlyScore > 30) {
        this.data.activityLevel = 'High';
      } else if (hourlyScore > 15) {
        this.data.activityLevel = 'Moderate';
      } else if (hourlyScore > 5) {
        this.data.activityLevel = 'Low';
      } else {
        this.data.activityLevel = 'Very Low';
      }
      
      logger.debug(`Activity score: ${hourlyScore}, Level: ${this.data.activityLevel}`);
    } catch (error) {
      logger.error(`Error calculating activity level: ${error.message}`);
      this.data.activityLevel = 'Moderate'; // Default fallback
    }
  }
  
  /**
   * Calculates the current mood level based on emoji usage
   */
  calculateMoodLevel() {
    try {
      const { positiveEmojis, negativeEmojis, neutralEmojis } = this.data.mood;
      const totalEmojis = positiveEmojis + negativeEmojis + neutralEmojis;
      
      if (totalEmojis === 0) {
        this.data.moodLevel = 'Neutral';
        return;
      }
      
      // Calculate the mood score (-1 to 1 scale)
      const moodScore = (positiveEmojis - negativeEmojis) / totalEmojis;
      
      // Define mood levels based on the score
      if (moodScore > 0.5) {
        this.data.moodLevel = 'Very Positive';
      } else if (moodScore > 0.2) {
        this.data.moodLevel = 'Positive';
      } else if (moodScore > -0.2) {
        this.data.moodLevel = 'Neutral';
      } else if (moodScore > -0.5) {
        this.data.moodLevel = 'Negative';
      } else {
        this.data.moodLevel = 'Very Negative';
      }
    } catch (error) {
      logger.error(`Error calculating mood level: ${error.message}`);
      this.data.moodLevel = 'Neutral'; // Default fallback
    }
  }
  
  /**
   * Gets the current community mood data
   * @returns {Object} Community mood data
   */
  getMoodData() {
    // Make sure data is up to date
    this.initializeIfNeeded();
    this.calculateActivityLevel();
    this.calculateMoodLevel();
    
    return {
      activityLevel: this.data.activityLevel,
      moodLevel: this.data.moodLevel,
      hourlyMessages: this.data.engagement.hourly.messageCount,
      dailyMessages: this.data.engagement.daily.messageCount,
      weeklyMessages: this.data.engagement.weekly.messageCount,
      hourlyActiveUsers: this.data.engagement.hourly.uniqueUsers.length,
      dailyActiveUsers: this.data.engagement.daily.uniqueUsers.length,
      weeklyActiveUsers: this.data.engagement.weekly.uniqueUsers.length,
      emojiMood: {
        positive: this.data.mood.positiveEmojis,
        negative: this.data.mood.negativeEmojis,
        neutral: this.data.mood.neutralEmojis
      }
    };
  }
}

// Singleton instance
const communityMood = new CommunityMood();

module.exports = communityMood;