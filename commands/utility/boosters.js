const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boosters')
    .setDescription('Show a list of members who are boosting the server'),
  
  cooldown: 10,
  
  /**
   * Executes the boosters command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Get guild from interaction
      const guild = interaction.guild;
      
      // Get all members who are boosting
      await guild.members.fetch(); // Fetch all members to ensure we have the most up-to-date data
      const boosters = guild.members.cache.filter(member => member.premiumSince !== null);
      
      if (boosters.size === 0) {
        return interaction.editReply('No one is currently boosting this server.');
      }
      
      // Sort boosters by boost date (oldest first)
      const sortedBoosters = [...boosters.values()].sort((a, b) => a.premiumSince - b.premiumSince);
      
      // Create an embed to display the boosters
      const embed = new EmbedBuilder()
        .setTitle(`${guild.name} Server Boosters`)
        .setDescription(`This server has **${boosters.size}** active boosters! ${getBoostLevelEmoji(guild.premiumTier)}`)
        .setColor(config.embedColor || '#f47fff') // Discord Nitro pink color
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setFooter({ text: `Server Boost Level: ${guild.premiumTier}` })
        .setTimestamp();
      
      // Add fields for boost information
      embed.addFields({
        name: 'Server Benefits',
        value: getBoostBenefits(guild.premiumTier)
      });
      
      // Group boosters by boost duration for a cleaner display
      const now = new Date();
      const oneMonth = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      const threeMonths = 3 * oneMonth;
      const sixMonths = 6 * oneMonth;
      
      const recentBoosters = [];
      const loyalBoosters = [];
      const longTermBoosters = [];
      const veteranBoosters = [];
      
      for (const booster of sortedBoosters) {
        const boostDuration = now - booster.premiumSince;
        const formattedDate = `<t:${Math.floor(booster.premiumSince.getTime() / 1000)}:R>`;
        const boosterInfo = `${booster} (${formattedDate})`;
        
        if (boostDuration < oneMonth) {
          recentBoosters.push(boosterInfo);
        } else if (boostDuration < threeMonths) {
          loyalBoosters.push(boosterInfo);
        } else if (boostDuration < sixMonths) {
          longTermBoosters.push(boosterInfo);
        } else {
          veteranBoosters.push(boosterInfo);
        }
      }
      
      // Add fields for each group if they have boosters
      if (veteranBoosters.length > 0) {
        embed.addFields({
          name: '🏆 Veteran Boosters (6+ months)',
          value: veteranBoosters.join('\n').substring(0, 1024) || 'None'
        });
      }
      
      if (longTermBoosters.length > 0) {
        embed.addFields({
          name: '💎 Long-term Boosters (3-6 months)',
          value: longTermBoosters.join('\n').substring(0, 1024) || 'None'
        });
      }
      
      if (loyalBoosters.length > 0) {
        embed.addFields({
          name: '💜 Loyal Boosters (1-3 months)',
          value: loyalBoosters.join('\n').substring(0, 1024) || 'None'
        });
      }
      
      if (recentBoosters.length > 0) {
        embed.addFields({
          name: '✨ Recent Boosters (<1 month)',
          value: recentBoosters.join('\n').substring(0, 1024) || 'None'
        });
      }
      
      // Send the embed
      await interaction.editReply({ embeds: [embed] });
      
      logger.info(`User ${interaction.user.tag} used the boosters command`);
    } catch (error) {
      logger.error(`Error executing boosters command: ${error.message}`);
      await interaction.editReply('An error occurred while fetching server boosters.');
    }
  },
};

/**
 * Get the emoji for the boost level
 * @param {number} level - The boost level
 * @returns {string} - The emoji
 */
function getBoostLevelEmoji(level) {
  switch(level) {
    case 1: return '💜';
    case 2: return '💗';
    case 3: return '💖';
    default: return '❤️';
  }
}

/**
 * Get the boost benefits text based on level
 * @param {number} level - The boost level
 * @returns {string} - The benefits text
 */
function getBoostBenefits(level) {
  switch(level) {
    case 3:
      return '• 100 emoji slots\n• 384 Kbps audio quality\n• 100 MB upload limit\n• Custom server banner\n• Custom invite background\n• Custom server URL\n• 60 min Go Live streams';
    case 2:
      return '• 50 emoji slots\n• 256 Kbps audio quality\n• 50 MB upload limit\n• Custom server banner\n• Custom invite background\n• 60 min Go Live streams';
    case 1:
      return '• 50 emoji slots\n• 128 Kbps audio quality\n• Animated server icon\n• Custom server invite background\n• 30 min Go Live streams';
    default:
      return '• This server is not yet boosted\n• Boost to unlock perks';
  }
}