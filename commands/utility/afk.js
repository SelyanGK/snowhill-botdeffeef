const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');
const Database = require('../../utils/database');

// AFK database
const afkDb = new Database('afk.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Set your AFK status with an optional message')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('The reason you are AFK')
        .setRequired(false)),
  
  cooldown: 10,
  
  /**
   * Executes the AFK command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const message = interaction.options.getString('message') || 'AFK';
      
      // Get the AFK data
      const afkData = afkDb.read() || {};
      
      // Initialize guild data if it doesn't exist
      if (!afkData[guildId]) {
        afkData[guildId] = {};
      }
      
      // Check if user is already AFK
      if (afkData[guildId][userId]) {
        // User is returning from AFK
        delete afkData[guildId][userId];
        afkDb.write(afkData);
        
        const embed = new EmbedBuilder()
          .setTitle('👋 Welcome back!')
          .setDescription(`Your AFK status has been removed.`)
          .setColor(config.embedColor)
          .setFooter({ text: 'Your AFK status has been cleared' })
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        
        // Try to update the user's nickname if it starts with '[AFK]'
        try {
          const member = interaction.member;
          if (member && member.manageable && member.displayName.startsWith('[AFK] ')) {
            await member.setNickname(member.displayName.replace('[AFK] ', ''));
          }
        } catch (error) {
          logger.error(`Failed to update nickname for ${interaction.user.tag}: ${error.message}`);
        }
        
        logger.info(`User ${interaction.user.tag} is no longer AFK`);
      } else {
        // Set user as AFK
        afkData[guildId][userId] = {
          timestamp: Date.now(),
          message: message
        };
        afkDb.write(afkData);
        
        const embed = new EmbedBuilder()
          .setTitle('💭 AFK Status Set')
          .setDescription(`I've set your AFK status${message ? `: ${message}` : ''}`)
          .setColor(config.embedColor)
          .setFooter({ text: 'You will no longer be marked as AFK when you send a message' })
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        
        // Try to update the user's nickname to include [AFK]
        try {
          const member = interaction.member;
          if (member && member.manageable && !member.displayName.startsWith('[AFK] ')) {
            await member.setNickname(`[AFK] ${member.displayName.substring(0, 25)}`);
          }
        } catch (error) {
          logger.error(`Failed to update nickname for ${interaction.user.tag}: ${error.message}`);
        }
        
        logger.info(`User ${interaction.user.tag} is now AFK: ${message}`);
      }
    } catch (error) {
      logger.error(`Error executing AFK command: ${error.message}`);
      await interaction.reply({ content: 'An error occurred while setting your AFK status. Please try again.', ephemeral: true });
    }
  },
  
  /**
   * Handles checking if a user who sent a message is AFK
   * @param {Message} message - The message
   */
  async checkAFK(message) {
    if (!message.guild || message.author.bot) return;
    
    try {
      const afkData = afkDb.read() || {};
      const guildId = message.guild.id;
      
      if (!afkData[guildId]) return;
      
      const userId = message.author.id;
      
      // If the message author is AFK, remove their AFK status
      if (afkData[guildId][userId]) {
        delete afkData[guildId][userId];
        afkDb.write(afkData);
        
        const embed = new EmbedBuilder()
          .setDescription(`**${message.author.username}**, I've removed your AFK status.`)
          .setColor(config.embedColor);
        
        const reply = await message.reply({ embeds: [embed] });
        
        // Delete the notification after 5 seconds
        setTimeout(() => reply.delete().catch(() => {}), 5000);
        
        // Try to update the user's nickname if it starts with '[AFK]'
        try {
          const member = message.member;
          if (member && member.manageable && member.displayName.startsWith('[AFK] ')) {
            await member.setNickname(member.displayName.replace('[AFK] ', ''));
          }
        } catch (error) {
          logger.error(`Failed to update nickname for ${message.author.tag}: ${error.message}`);
        }
      }
      
      // Check if any mentioned users are AFK
      const mentionedMembers = message.mentions.members;
      if (mentionedMembers && mentionedMembers.size > 0) {
        mentionedMembers.forEach(async member => {
          if (afkData[guildId][member.id]) {
            const afkInfo = afkData[guildId][member.id];
            const afkTime = Math.floor((Date.now() - afkInfo.timestamp) / 1000);
            
            const afkEmbed = new EmbedBuilder()
              .setDescription(`**${member.user.username}** is AFK: ${afkInfo.message}\n*AFK for <t:${Math.floor(afkInfo.timestamp / 1000)}:R>*`)
              .setColor(config.embedColor);
            
            await message.reply({ embeds: [afkEmbed] });
          }
        });
      }
    } catch (error) {
      logger.error(`Error checking AFK status: ${error.message}`);
    }
  }
};
