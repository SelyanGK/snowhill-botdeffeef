const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('messages')
    .setDescription('Count messages from a user in the server or channel')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to count messages from')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to count messages in (leave empty for all channels)')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('days')
        .setDescription('Number of days to look back (1-30, default: all time)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(30))
    .setDefaultMemberPermissions(PermissionFlagsBits.ViewChannel),
  
  cooldown: 30, // High cooldown to prevent spam
  
  /**
   * Executes the messages command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    // Defer the reply as this might take a moment
    await interaction.deferReply();
    
    try {
      const targetUser = interaction.options.getUser('user');
      const channel = interaction.options.getChannel('channel');
      const days = interaction.options.getInteger('days');
      
      // Create the embed
      const embed = new EmbedBuilder()
        .setTitle(`Message Count for ${targetUser.tag}`)
        .setColor(config.embedColor || '#3498db')
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp();
      
      // Begin searching message count
      if (channel) {
        // Search in a specific channel
        const messageCount = await this.countMessages(interaction, targetUser.id, channel.id, days);
        
        const timeframeText = days ? `in the past ${days} day(s)` : 'since joining';
        embed.setDescription(`**${targetUser}** has sent approximately **${messageCount}** messages in ${channel} ${timeframeText}.`);
        embed.addFields({ name: 'Channel', value: `${channel}`, inline: true });
      } else {
        // Search in all channels
        const messageCount = await this.countMessages(interaction, targetUser.id, null, days);
        
        const timeframeText = days ? `in the past ${days} day(s)` : 'since joining';
        embed.setDescription(`**${targetUser}** has sent approximately **${messageCount}** messages in this server ${timeframeText}.`);
      }
      
      const timeframeFieldText = days ? `Past ${days} day(s)` : 'Lifetime';
      embed.addFields({ name: 'Timeframe', value: timeframeFieldText, inline: true });
      
      await interaction.editReply({ embeds: [embed] });
      
      logger.info(`User ${interaction.user.tag} counted messages for ${targetUser.tag}`);
    } catch (error) {
      logger.error(`Error counting messages: ${error.message}`);
      await interaction.editReply('An error occurred while counting messages. This may be due to rate limits or missing permissions.');
    }
  },
  
  /**
   * Count messages from a user using Discord's search functionality
   * @param {Interaction} interaction - The interaction
   * @param {string} userId - The user ID to count messages from
   * @param {string|null} channelId - The channel ID to count in, or null for all channels
   * @param {number} days - Number of days to look back
   * @returns {Promise<number>} - The approximate message count
   */
  async countMessages(interaction, userId, channelId, days) {
    try {
      // Status message to inform user we're counting
      await interaction.followUp({ 
        content: `Counting messages... This may take a moment.`, 
        ephemeral: true 
      });
      
      if (channelId) {
        // Count messages in a specific channel
        const channel = await interaction.client.channels.fetch(channelId);
        if (!channel || !channel.messages) {
          throw new Error('Cannot access the specified channel');
        }
        
        let messageCount = 0;
        let lastId = null;
        let stop = false;
        let messagesLeft = true;
        
        // Set the time limit if days is specified
        let timeLimit = null;
        if (days) {
          timeLimit = new Date();
          timeLimit.setDate(timeLimit.getDate() - days);
        }
        
        // Maximum number of fetch operations to prevent API abuse
        const maxFetchOperations = 20; // This would give us up to 2000 messages
        let fetchOperations = 0;
        
        // Loop to fetch messages in batches
        while (messagesLeft && fetchOperations < maxFetchOperations && !stop) {
          const options = { limit: 100 };
          if (lastId) {
            options.before = lastId;
          }
          
          const messages = await channel.messages.fetch(options);
          
          if (messages.size === 0) {
            messagesLeft = false;
            break;
          }
          
          lastId = messages.last().id;
          fetchOperations++;
          
          // Count messages from the target user
          for (const message of messages.values()) {
            // Check if we need to stop due to time limit
            if (timeLimit && message.createdAt < timeLimit) {
              stop = true;
              break;
            }
            
            if (message.author.id === userId) {
              messageCount++;
            }
          }
        }
        
        return messageCount;
      } else {
        // For server-wide counts, we'll count in each text channel
        const guild = interaction.guild;
        if (!guild) {
          throw new Error('Cannot perform guild-wide search in DMs');
        }
        
        // Get all visible text channels
        const textChannels = guild.channels.cache.filter(c => 
          c.type === 0 && // 0 is GUILD_TEXT
          c.permissionsFor(guild.members.me).has(['ViewChannel', 'ReadMessageHistory'])
        );
        
        let totalMessages = 0;
        
        // For each channel, count messages
        // Limit to 10 channels to prevent rate limiting
        let channelCount = 0;
        const maxChannelsToCheck = 10;
        
        for (const channel of textChannels.values()) {
          if (channelCount >= maxChannelsToCheck) break;
          
          // Skip channels that the user can't access
          if (!channel.permissionsFor(userId).has('ViewChannel')) continue;
          
          channelCount++;
          
          // Use the same counting logic for each channel
          let messageCount = 0;
          let lastId = null;
          let stop = false;
          let messagesLeft = true;
          
          // Set the time limit if days is specified
          let timeLimit = null;
          if (days) {
            timeLimit = new Date();
            timeLimit.setDate(timeLimit.getDate() - days);
          }
          
          // Maximum number of fetch operations per channel to prevent API abuse
          const maxFetchOperations = 5; // Fewer operations for server-wide search
          let fetchOperations = 0;
          
          // Loop to fetch messages in batches
          while (messagesLeft && fetchOperations < maxFetchOperations && !stop) {
            const options = { limit: 100 };
            if (lastId) {
              options.before = lastId;
            }
            
            try {
              const messages = await channel.messages.fetch(options);
              
              if (messages.size === 0) {
                messagesLeft = false;
                break;
              }
              
              lastId = messages.last().id;
              fetchOperations++;
              
              // Count messages from the target user
              for (const message of messages.values()) {
                // Check if we need to stop due to time limit
                if (timeLimit && message.createdAt < timeLimit) {
                  stop = true;
                  break;
                }
                
                if (message.author.id === userId) {
                  messageCount++;
                }
              }
            } catch (channelError) {
              logger.warn(`Error fetching messages from channel ${channel.id}: ${channelError.message}`);
              break; // Skip this channel if there's an error
            }
          }
          
          totalMessages += messageCount;
        }
        
        return totalMessages;
      }
    } catch (error) {
      logger.error(`Error in message count: ${error.message}`);
      return 0; // Return 0 on error
    }
  }
};