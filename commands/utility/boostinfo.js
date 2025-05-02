const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boostinfo')
    .setDescription('Show information about the server boost status'),
  
  cooldown: 10,
  
  /**
   * Executes the boostinfo command
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
      
      // Get the boost count
      const boostCount = guild.premiumSubscriptionCount || 0;
      
      // Get the current boost level
      const boostLevel = guild.premiumTier;
      
      // Get the boost requirements for next level
      const boostsForNextLevel = getBoostsRequiredForNextLevel(boostLevel);
      
      // Create an embed to display the boost information
      const embed = new EmbedBuilder()
        .setTitle(`${guild.name} - Server Boost Status`)
        .setDescription(`This server currently has **${boostCount}** ${boostCount === 1 ? 'boost' : 'boosts'} from **${boosters.size}** ${boosters.size === 1 ? 'member' : 'members'}! ${getBoostLevelEmoji(boostLevel)}`)
        .setColor(config.embedColor || '#f47fff') // Discord Nitro pink color
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setTimestamp();
      
      // Add fields for boost information
      embed.addFields(
        { name: 'Current Boost Level', value: `Level ${boostLevel}`, inline: true },
        { name: 'Active Boosters', value: `${boosters.size} members`, inline: true },
        { name: 'Total Boosts', value: `${boostCount} boosts`, inline: true }
      );
      
      // Add progress to next level if not already at max level
      if (boostLevel < 3) {
        const nextLevel = boostLevel + 1;
        const boostsNeeded = boostsForNextLevel - boostCount;
        const progressPercentage = Math.min(100, Math.round((boostCount / boostsForNextLevel) * 100));
        
        // Create a progress bar
        const progressBarLength = 20;
        const filledBlocks = Math.round((progressPercentage / 100) * progressBarLength);
        const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(progressBarLength - filledBlocks);
        
        embed.addFields({
          name: `Progress to Level ${nextLevel}`,
          value: `${progressBar} ${progressPercentage}%\n${boostsNeeded} more ${boostsNeeded === 1 ? 'boost' : 'boosts'} needed for Level ${nextLevel}`
        });
      }
      
      // Add current perks field
      embed.addFields({
        name: 'Current Server Perks',
        value: getBoostBenefits(boostLevel)
      });
      
      // Add next level perks if not at max level
      if (boostLevel < 3) {
        embed.addFields({
          name: `Level ${boostLevel + 1} Server Perks`,
          value: getBoostBenefits(boostLevel + 1)
        });
      }
      
      // Add tips for boosting
      embed.addFields({
        name: 'How to Boost',
        value: 'To boost this server, click the server name at the top of the channel list, then select "Server Boost"'
      });
      
      // Send the embed
      await interaction.editReply({ embeds: [embed] });
      
      logger.info(`User ${interaction.user.tag} used the boostinfo command`);
    } catch (error) {
      logger.error(`Error executing boostinfo command: ${error.message}`);
      await interaction.editReply('An error occurred while fetching server boost information.');
    }
  },
};

/**
 * Get the boosts required for the next level
 * @param {number} currentLevel - The current boost level
 * @returns {number} - The number of boosts required for the next level
 */
function getBoostsRequiredForNextLevel(currentLevel) {
  switch(currentLevel) {
    case 0: return 2;  // Need 2 boosts to reach Level 1
    case 1: return 15; // Need 15 boosts to reach Level 2
    case 2: return 30; // Need 30 boosts to reach Level 3
    case 3: return 30; // Already at max level, return current requirement
    default: return 2;
  }
}

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