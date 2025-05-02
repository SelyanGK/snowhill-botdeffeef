const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config.json');
const communityMood = require('../../utils/communityMood');

// Emoji mapping for different moods
const MOOD_EMOJI = {
  'Very Positive': '😄',
  'Positive': '🙂',
  'Neutral': '😐',
  'Negative': '🙁',
  'Very Negative': '😢'
};

// Emoji mapping for different activity levels
const ACTIVITY_EMOJI = {
  'Very High': '🔥',
  'High': '⚡',
  'Moderate': '✨',
  'Low': '💤',
  'Very Low': '🌙'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('communitymood')
    .setDescription('View the current community mood and server engagement levels')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current community mood'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View detailed mood statistics')),
  
  cooldown: 30, // Longer cooldown since this is resource-intensive
  
  /**
   * Executes the communitymood command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'view') {
      await this.showMoodWidget(interaction);
    } else if (subcommand === 'stats') {
      await this.showDetailedStats(interaction);
    }
    
    logger.info(`User ${interaction.user.tag} viewed the community mood widget`);
  },
  
  /**
   * Shows the community mood widget
   * @param {Interaction} interaction - The interaction
   */
  async showMoodWidget(interaction) {
    await interaction.deferReply();
    
    try {
      // Get the current mood data
      const moodData = communityMood.getMoodData();
      
      // Create the mood widget embed
      const embed = new EmbedBuilder()
        .setTitle(`${interaction.guild.name} Community Mood`)
        .setDescription('Real-time server engagement and mood tracking')
        .setColor(this.getMoodColor(moodData.moodLevel))
        .addFields(
          { 
            name: 'Current Mood', 
            value: `${MOOD_EMOJI[moodData.moodLevel] || '😐'} **${moodData.moodLevel}**`, 
            inline: true 
          },
          { 
            name: 'Activity Level', 
            value: `${ACTIVITY_EMOJI[moodData.activityLevel] || '✨'} **${moodData.activityLevel}**`, 
            inline: true 
          },
          { 
            name: '\u200B', 
            value: '\u200B', 
            inline: true 
          },
          { 
            name: 'Active Users (Last Hour)', 
            value: `👥 **${moodData.hourlyActiveUsers}** members`, 
            inline: true 
          },
          { 
            name: 'Messages (Today)', 
            value: `💬 **${moodData.dailyMessages}** messages`, 
            inline: true 
          },
          { 
            name: 'Weekly Active Users', 
            value: `👥 **${moodData.weeklyActiveUsers}** members`, 
            inline: true 
          }
        )
        .setFooter({ text: 'Community mood updates automatically based on server activity' })
        .setTimestamp();
      
      // Add a visual mood chart
      const moodChart = this.generateMoodVisualization(moodData);
      embed.setDescription(`Real-time server engagement and mood tracking\n\n${moodChart}`);
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error(`Error showing community mood widget: ${error.message}`);
      await interaction.editReply('An error occurred while fetching the community mood data.');
    }
  },
  
  /**
   * Shows detailed community mood statistics
   * @param {Interaction} interaction - The interaction
   */
  async showDetailedStats(interaction) {
    await interaction.deferReply();
    
    try {
      // Get the current mood data
      const moodData = communityMood.getMoodData();
      
      // Create the detailed stats embed
      const embed = new EmbedBuilder()
        .setTitle(`${interaction.guild.name} Community Mood Stats`)
        .setDescription('Detailed statistics about community engagement and mood')
        .setColor(this.getMoodColor(moodData.moodLevel))
        .addFields(
          { 
            name: 'Message Statistics', 
            value: `Past Hour: **${moodData.hourlyMessages}**\nToday: **${moodData.dailyMessages}**\nThis Week: **${moodData.weeklyMessages}**`, 
            inline: true 
          },
          { 
            name: 'Active User Statistics', 
            value: `Past Hour: **${moodData.hourlyActiveUsers}**\nToday: **${moodData.dailyActiveUsers}**\nThis Week: **${moodData.weeklyActiveUsers}**`, 
            inline: true 
          },
          { 
            name: 'Emoji Mood Analysis', 
            value: `😄 Positive: **${moodData.emojiMood.positive}**\n😐 Neutral: **${moodData.emojiMood.neutral}**\n🙁 Negative: **${moodData.emojiMood.negative}**`, 
            inline: false 
          }
        )
        .setFooter({ text: 'Based on message content, reactions, and overall engagement' })
        .setTimestamp();
      
      // Add detailed visualization
      const moodChart = this.generateDetailedMoodChart(moodData);
      embed.addFields({
        name: 'Community Mood Chart',
        value: moodChart,
        inline: false
      });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error(`Error showing detailed community mood stats: ${error.message}`);
      await interaction.editReply('An error occurred while fetching the detailed community mood statistics.');
    }
  },
  
  /**
   * Gets the color based on the mood level
   * @param {string} moodLevel - The current mood level
   * @returns {number} - The color as a decimal number
   */
  getMoodColor(moodLevel) {
    switch (moodLevel) {
      case 'Very Positive': return 0x2ecc71; // Green
      case 'Positive': return 0x3498db; // Blue
      case 'Neutral': return 0x95a5a6; // Gray
      case 'Negative': return 0xe67e22; // Orange
      case 'Very Negative': return 0xe74c3c; // Red
      default: return config.embedColor || 0x3498db; // Default
    }
  },
  
  /**
   * Generates a visual ASCII chart of the community mood
   * @param {Object} moodData - The mood data object
   * @returns {string} - The ASCII chart
   */
  generateMoodVisualization(moodData) {
    // Create a simple ASCII mood meter
    const activityLevel = ['Very Low', 'Low', 'Moderate', 'High', 'Very High'].indexOf(moodData.activityLevel);
    const moodLevel = ['Very Negative', 'Negative', 'Neutral', 'Positive', 'Very Positive'].indexOf(moodData.moodLevel);
    
    // Normalize levels to 0-4 scale
    const normalizedActivity = activityLevel === -1 ? 2 : activityLevel;
    const normalizedMood = moodLevel === -1 ? 2 : moodLevel;
    
    // Create the vertical mood meter
    const moodMeter = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const activityIndicator = '▄'.repeat(normalizedActivity + 1) + '▁'.repeat(4 - normalizedActivity);
    const moodIndicator = '▄'.repeat(normalizedMood + 1) + '▁'.repeat(4 - normalizedMood);
    
    return '```\n' +
      `Community Mood:    ${moodIndicator} ${MOOD_EMOJI[moodData.moodLevel] || '😐'}\n` +
      `Activity Level:    ${activityIndicator} ${ACTIVITY_EMOJI[moodData.activityLevel] || '✨'}\n` +
      '```';
  },
  
  /**
   * Generates a more detailed mood chart
   * @param {Object} moodData - The mood data object
   * @returns {string} - The detailed chart
   */
  generateDetailedMoodChart(moodData) {
    // Calculate emoji mood percentages
    const totalEmojis = moodData.emojiMood.positive + moodData.emojiMood.neutral + moodData.emojiMood.negative;
    
    if (totalEmojis === 0) {
      return '```\nNot enough emoji data to generate a mood chart.\n```';
    }
    
    const positivePercent = Math.round((moodData.emojiMood.positive / totalEmojis) * 100);
    const neutralPercent = Math.round((moodData.emojiMood.neutral / totalEmojis) * 100);
    const negativePercent = Math.round((moodData.emojiMood.negative / totalEmojis) * 100);
    
    // Create bar chart representation
    const posBar = '█'.repeat(Math.floor(positivePercent / 5)) + '░'.repeat(20 - Math.floor(positivePercent / 5));
    const neutBar = '█'.repeat(Math.floor(neutralPercent / 5)) + '░'.repeat(20 - Math.floor(neutralPercent / 5));
    const negBar = '█'.repeat(Math.floor(negativePercent / 5)) + '░'.repeat(20 - Math.floor(negativePercent / 5));
    
    return '```\n' +
      `Positive (${positivePercent}%): ${posBar}\n` +
      `Neutral  (${neutralPercent}%): ${neutBar}\n` +
      `Negative (${negativePercent}%): ${negBar}\n` +
      '```';
  }
};