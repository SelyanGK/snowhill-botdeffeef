const fs = require('fs');
const path = require('path');
const { PermissionFlagsBits } = require('discord.js');
const logger = require('../utils/logger');
const Database = require('../utils/database');

// Databases
const stickyDb = new Database('sticky.json');
const antipingDb = new Database('antiping.json');
const afkDb = new Database('afk.json');

// Import commands that need to hook into message events
const afkCommand = require('../commands/utility/afk');
const snipeCommand = require('../commands/utility/snipe');
const levelCommand = require('../commands/misc/level');
const autoreplyCommand = require('../commands/utility/autoreply');
const scrambleCommand = require('../commands/fun/scramble');

module.exports = {
  name: 'messageCreate',
  /**
   * Executes when a message is created
   * @param {Message} message - The created message
   * @param {Client} client - The Discord client
   */
  async execute(message, client) {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Check for anti-ping violations
    await this.checkAntiPing(message, client);
    
    // Check for AFK status
    await afkCommand.checkAFK(message);
    
    // Handle XP for leveling system
    levelCommand.handleMessageXp(message);
    
    // Check for auto-reply triggers
    await autoreplyCommand.checkMessage(message);
    
    // Check for Word Scramble game guesses
    if (scrambleCommand.checkUserGuess) {
      await scrambleCommand.checkUserGuess(message);
    }
    
    // Handle sticky messages functionality with rate limiting to prevent lag
    try {
      const stickyMessages = stickyDb.read();
      const channelId = message.channel.id;
      
      // Check if there's a sticky message for this channel
      if (stickyMessages[channelId]) {
        const stickyData = stickyMessages[channelId];
        
        // Skip if the message author is the bot itself
        if (message.author.id === client.user.id) return;
        
        // Skip if the message ID is the same as the stored lastMessageId (prevents double processing)
        if (message.id === stickyData.lastMessageId) return;
        
        // Check if the current time is after the cooldown period
        const currentTime = Date.now();
        const cooldownTime = stickyData.lastStickyTime || 0;
        const cooldownPeriod = 2000; // 2 seconds cooldown between sticky messages
        
        // Skip if we're within the cooldown period
        if (currentTime - cooldownTime < cooldownPeriod) {
          return;
        }
        
        // Count messages since last sticky (to only show after X messages)
        const messageCountKey = `${channelId}_messageCount`;
        if (!stickyMessages[messageCountKey]) {
          stickyMessages[messageCountKey] = 0;
        }
        
        // Increment message count
        stickyMessages[messageCountKey]++;
        
        // Only show sticky message after every 5 regular messages
        // This prevents spam in active channels
        if (stickyMessages[messageCountKey] < 5) {
          stickyDb.write(stickyMessages); // Save the updated message count
          return;
        }
        
        // Reset message counter
        stickyMessages[messageCountKey] = 0;
        
        // Use a lock system to prevent multiple sticky messages being sent simultaneously
        const lockKey = `${channelId}_lock`;
        if (stickyMessages[lockKey]) {
          // There's an active sticky message operation for this channel
          // Skip this operation to prevent duplicates
          return;
        }
        
        // Set the lock
        stickyMessages[lockKey] = true;
        stickyDb.write(stickyMessages);
        
        try {
          // Delete the previous sticky message if it exists and is still in cache
          if (stickyData.lastMessageId) {
            const channel = client.channels.cache.get(channelId);
            if (channel) {
              // Try to fetch the message but don't throw if not found
              const previousMessage = await channel.messages
                .fetch(stickyData.lastMessageId)
                .catch(() => null);
                
              if (previousMessage && !previousMessage.deleted) {
                await previousMessage.delete().catch(err => {
                  logger.warn(`Failed to delete previous sticky message: ${err.message}`);
                });
              }
            }
          }
          
          // Send a new sticky message
          const newStickyMessage = await message.channel.send({
            content: stickyData.content,
            embeds: stickyData.embedContent ? [{
              description: stickyData.embedContent,
              color: parseInt(stickyData.color || '#3498db'.replace('#', ''), 16)
            }] : []
          });
          
          // Update the last message ID and timestamp
          stickyMessages[channelId].lastMessageId = newStickyMessage.id;
          stickyMessages[channelId].lastStickyTime = currentTime;
          
          // Release the lock
          delete stickyMessages[lockKey];
          
          stickyDb.write(stickyMessages);
        } catch (error) {
          // Release the lock even if there's an error
          delete stickyMessages[lockKey];
          stickyDb.write(stickyMessages);
          
          logger.error(`Failed to send sticky message: ${error.message}`);
        }
      }
    } catch (error) {
      logger.error(`Error processing sticky messages: ${error.message}`);
    }
  },

  /**
   * Checks if a message violates the anti-ping settings
   * @param {Message} message - The message to check
   * @param {Client} client - The Discord client
   */
  async checkAntiPing(message, client) {
    try {
      // Get anti-ping configuration
      const antipingConfig = antipingDb.read();
      
      // Check if anti-ping system is enabled
      if (!antipingConfig.enabled) return;
      
      // Check if the no-ping role is set
      if (!antipingConfig.noPingRoleId) return;
      
      // Check if message has mentions
      if (message.mentions.users.size === 0 && message.mentions.roles.size === 0) return;
      
      // Check if the message author is a moderator (can't be muted)
      if (message.member.permissions.has([PermissionFlagsBits.ModerateMembers])) return;
      
      // Check if the message author has the bypass role
      if (antipingConfig.bypassRoleId && message.member.roles.cache.has(antipingConfig.bypassRoleId)) return;
      
      // Get message content and replied message if any
      const isReply = message.reference && message.reference.messageId;
      let repliedMessage = null;
      
      if (isReply) {
        try {
          // Get the message being replied to
          repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
        } catch (error) {
          logger.warn(`Failed to fetch replied message: ${error.message}`);
        }
      }
      
      // Create a set of exempt user IDs (users from the reply)
      const exemptUserIds = new Set();
      
      if (repliedMessage) {
        // Add the author of the replied message to exempt list
        exemptUserIds.add(repliedMessage.author.id);
      }
      
      // Check if any of the mentioned users have the no-ping role
      let hasViolation = false;
      let violatedUser = null;
      
      // Check user mentions
      for (const [userId, user] of message.mentions.users) {
        // Skip if this is a replied-to user (allowed to be pinged in a reply)
        if (exemptUserIds.has(userId)) continue;
        
        try {
          const member = await message.guild.members.fetch(userId);
          
          if (member.roles.cache.has(antipingConfig.noPingRoleId)) {
            hasViolation = true;
            violatedUser = user;
            break;
          }
        } catch (err) {
          // Skip if can't fetch member
          continue;
        }
      }
      
      // If no violations in user mentions, check role mentions
      if (!hasViolation && antipingConfig.noPingRoleId) {
        if (message.mentions.roles.has(antipingConfig.noPingRoleId)) {
          hasViolation = true;
        }
      }
      
      // If a violation is found, mute the user
      if (hasViolation) {
        // Get mute duration
        const muteDuration = antipingConfig.muteDuration || 15; // Default to 15 minutes
        const muteEndTime = Date.now() + (muteDuration * 60 * 1000);
        
        try {
          // Delete the violating message immediately
          await message.delete().catch(err => {
            logger.error(`Failed to delete violating message: ${err.message}`);
          });

          // Format a better reason for the timeout log
          const timeoutReason = violatedUser 
            ? `Anti-ping violation: Pinged protected user ${violatedUser.tag}` 
            : `Anti-ping violation: Pinged protected role`;
            
          // Apply timeout (Discord's built-in mute)
          await message.member.timeout(muteDuration * 60 * 1000, timeoutReason);
          
          // Format the duration in a human-readable way
          let formattedDuration;
          if (muteDuration >= 1440) { // more than 24 hours
            const days = Math.floor(muteDuration / 1440);
            formattedDuration = `${days} day${days > 1 ? 's' : ''}`;
          } else if (muteDuration >= 60) { // more than 60 minutes
            const hours = Math.floor(muteDuration / 60);
            formattedDuration = `${hours} hour${hours > 1 ? 's' : ''}`;
          } else {
            formattedDuration = `${muteDuration} minute${muteDuration > 1 ? 's' : ''}`;
          }
          
          // Create the warning message
          const warnMessage = antipingConfig.warnMessage || 
            `Please don't ping that person. You have been timeouted for ${formattedDuration}.`;
            
          try {
            // Send warning to the user via DM
            const dmChannel = await message.author.createDM();
            await dmChannel.send({
              embeds: [{
                title: '⚠️ Anti-Ping Violation',
                description: warnMessage,
                fields: [
                  { name: 'Duration', value: formattedDuration, inline: true },
                  { name: 'Server', value: message.guild.name, inline: true },
                  { name: 'Expires', value: `<t:${Math.floor(muteEndTime / 1000)}:R>`, inline: true }
                ],
                color: 0xff0000,
                timestamp: new Date().toISOString()
              }]
            });
          } catch (dmError) {
            // If DM fails, send a message in the channel that auto-deletes after 20 seconds
            try {
              const notificationMsg = await message.channel.send({
                content: `${message.author}, ${warnMessage}`,
                allowedMentions: { users: [message.author.id] }
              });
              
              // Delete the notification after 20 seconds
              setTimeout(() => {
                notificationMsg.delete().catch(() => {});
              }, 20000);
            } catch (channelError) {
              logger.error(`Failed to send notification message: ${channelError.message}`);
            }
          }
          
          // Log the violation if a log channel is set - this won't auto-delete as it's useful for moderation history
          if (antipingConfig.logChannelId) {
            const logChannel = client.channels.cache.get(antipingConfig.logChannelId);
            if (logChannel) {
              await logChannel.send({
                embeds: [{
                  title: 'Anti-Ping Violation',
                  description: `${message.author} has been timed out for ${muteDuration} minutes for violating the anti-ping protection rules.`,
                  fields: [
                    { name: 'Offender', value: `${message.author.tag} (${message.author.id})`, inline: true },
                    { name: 'Violated User', value: violatedUser ? `${violatedUser.tag} (${violatedUser.id})` : 'Protected Role', inline: true },
                    { name: 'Channel', value: `${message.channel} (${message.channel.id})`, inline: true },
                    { name: 'Expires', value: `<t:${Math.floor(muteEndTime / 1000)}:R>`, inline: true }
                  ],
                  color: 0xff0000,
                  timestamp: new Date().toISOString()
                }]
              });
            }
          }
          
          // Log the violation with additional info about the context
          const isReplyContext = message.reference && message.reference.messageId ? 'in a reply' : 'in a regular message';
          logger.info(`Anti-ping violation: ${message.author.tag} (${message.author.id}) timed out for ${muteDuration} minutes - Violation occurred ${isReplyContext}`);
        } catch (error) {
          logger.error(`Failed to timeout user for anti-ping violation: ${error.message}`);
        }
      } else if (message.reference && message.reference.messageId && message.mentions.users.size > 0) {
        // For debugging: log when a reply with mentions was allowed
        const mentionedIds = Array.from(message.mentions.users.keys());
        const exemptIds = Array.from(exemptUserIds);
        const allowedReason = exemptIds.some(id => mentionedIds.includes(id)) ? 
          'mentions were to the replied-to author (allowed)' : 
          'no protected users were mentioned';
          
        logger.debug(`Reply with mentions was allowed: ${message.author.tag} replied to a message - ${allowedReason}`);
      }
    } catch (error) {
      logger.error(`Error checking anti-ping: ${error.message}`);
    }
  }
};
