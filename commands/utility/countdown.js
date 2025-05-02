const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

// Store active countdowns - Map<channelId, { interval, endTime, messageId }>
const activeCountdowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('countdown')
    .setDescription('Start a countdown timer in the channel')
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Start a new countdown')
        .addStringOption(option =>
          option.setName('title')
            .setDescription('Title of the countdown')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('hours')
            .setDescription('Hours for the countdown')
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(24))
        .addIntegerOption(option =>
          option.setName('minutes')
            .setDescription('Minutes for the countdown')
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(59))
        .addIntegerOption(option =>
          option.setName('seconds')
            .setDescription('Seconds for the countdown')
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(59))
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Message to display when the countdown ends')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('cancel')
        .setDescription('Cancel the active countdown in this channel'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  cooldown: 5,
  
  /**
   * Executes the countdown command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === 'start') {
        await this.startCountdown(interaction);
      } else if (subcommand === 'cancel') {
        await this.cancelCountdown(interaction);
      }
    } catch (error) {
      logger.error(`Error executing countdown command: ${error.message}`);
      await interaction.reply({
        content: 'An error occurred while executing the countdown command.',
        ephemeral: true
      });
    }
  },
  
  /**
   * Start a new countdown
   * @param {Interaction} interaction - The interaction
   */
  async startCountdown(interaction) {
    // Check if there's already an active countdown in this channel
    const channelId = interaction.channelId;
    if (activeCountdowns.has(channelId)) {
      return interaction.reply({
        content: 'There is already an active countdown in this channel. Cancel it first with `/countdown cancel`.',
        ephemeral: true
      });
    }
    
    // Get options
    const title = interaction.options.getString('title');
    const hours = interaction.options.getInteger('hours') || 0;
    const minutes = interaction.options.getInteger('minutes') || 0;
    const seconds = interaction.options.getInteger('seconds') || 0;
    const endMessage = interaction.options.getString('message') || 'Countdown complete!';
    
    // Calculate total time in milliseconds
    const totalTime = (hours * 60 * 60 + minutes * 60 + seconds) * 1000;
    
    // Ensure the countdown is at least 5 seconds
    if (totalTime < 5000) {
      return interaction.reply({
        content: 'The countdown must be at least 5 seconds long.',
        ephemeral: true
      });
    }
    
    // Calculate end time
    const endTime = Date.now() + totalTime;
    
    // Defer reply to avoid timeout
    await interaction.deferReply();
    
    // Create initial countdown message
    const remainingTime = this.formatRemainingTime(endTime - Date.now());
    const embed = new EmbedBuilder()
      .setTitle(`⏱️ ${title}`)
      .setDescription(`Time remaining: **${remainingTime}**`)
      .setColor(config.embedColor || '#3498db')
      .setFooter({ text: `Started by ${interaction.user.tag}` })
      .setTimestamp();
    
    // Send initial message
    const reply = await interaction.editReply({ embeds: [embed] });
    
    // Store countdown data
    const countdown = {
      interval: null,
      endTime,
      messageId: reply.id,
      title,
      endMessage,
      userId: interaction.user.id
    };
    
    // Set up interval to update the countdown every second
    countdown.interval = setInterval(() => {
      this.updateCountdown(interaction.client, channelId, countdown);
    }, 1000);
    
    activeCountdowns.set(channelId, countdown);
    
    logger.info(`User ${interaction.user.tag} started a countdown in channel #${interaction.channel.name}: ${title} for ${remainingTime}`);
  },
  
  /**
   * Update the countdown message
   * @param {Client} client - The Discord client
   * @param {string} channelId - The channel ID
   * @param {Object} countdown - The countdown data
   */
  async updateCountdown(client, channelId, countdown) {
    try {
      const timeLeft = countdown.endTime - Date.now();
      
      // Get channel
      const channel = await client.channels.fetch(channelId);
      if (!channel) {
        this.clearCountdown(channelId);
        return;
      }
      
      // Try to fetch the message
      let message;
      try {
        message = await channel.messages.fetch(countdown.messageId);
      } catch (error) {
        // Message may have been deleted, clear the countdown
        this.clearCountdown(channelId);
        return;
      }
      
      if (timeLeft <= 0) {
        // Countdown has ended
        clearInterval(countdown.interval);
        
        const completedEmbed = new EmbedBuilder()
          .setTitle(`⏱️ ${countdown.title} - Complete!`)
          .setDescription(countdown.endMessage)
          .setColor('#2ecc71')
          .setFooter({ text: `Started by ${client.users.cache.get(countdown.userId)?.tag || 'Unknown'}` })
          .setTimestamp();
        
        await message.edit({ embeds: [completedEmbed] });
        
        // Send notification message that the countdown is complete
        await channel.send({
          content: `⏱️ **${countdown.title}** has ended! ${countdown.endMessage}`,
          allowedMentions: { parse: [] } // Prevent mentions
        });
        
        // Clear the countdown
        activeCountdowns.delete(channelId);
      } else {
        // Update countdown message
        const remainingTime = this.formatRemainingTime(timeLeft);
        const updatedEmbed = new EmbedBuilder()
          .setTitle(`⏱️ ${countdown.title}`)
          .setDescription(`Time remaining: **${remainingTime}**`)
          .setColor(config.embedColor || '#3498db')
          .setFooter({ text: `Started by ${client.users.cache.get(countdown.userId)?.tag || 'Unknown'}` })
          .setTimestamp();
        
        await message.edit({ embeds: [updatedEmbed] });
      }
    } catch (error) {
      logger.error(`Error updating countdown: ${error.message}`);
      this.clearCountdown(channelId);
    }
  },
  
  /**
   * Cancel an active countdown
   * @param {Interaction} interaction - The interaction
   */
  async cancelCountdown(interaction) {
    const channelId = interaction.channelId;
    
    // Check if there's an active countdown in this channel
    if (!activeCountdowns.has(channelId)) {
      return interaction.reply({
        content: 'There is no active countdown in this channel.',
        ephemeral: true
      });
    }
    
    // Get countdown data
    const countdown = activeCountdowns.get(channelId);
    
    // Clear the interval
    clearInterval(countdown.interval);
    
    // Update the message
    try {
      const channel = interaction.channel;
      const message = await channel.messages.fetch(countdown.messageId);
      
      const cancelledEmbed = new EmbedBuilder()
        .setTitle(`⏱️ ${countdown.title} - Cancelled`)
        .setDescription('This countdown was cancelled.')
        .setColor('#e74c3c')
        .setFooter({ text: `Cancelled by ${interaction.user.tag}` })
        .setTimestamp();
      
      await message.edit({ embeds: [cancelledEmbed] });
    } catch (error) {
      logger.error(`Error updating cancelled countdown message: ${error.message}`);
    }
    
    // Remove countdown
    activeCountdowns.delete(channelId);
    
    // Reply to interaction
    await interaction.reply({
      content: `Cancelled the countdown **${countdown.title}**.`,
      ephemeral: true
    });
    
    logger.info(`User ${interaction.user.tag} cancelled a countdown in channel #${interaction.channel.name}`);
  },
  
  /**
   * Clear a countdown without updating the message
   * @param {string} channelId - The channel ID
   */
  clearCountdown(channelId) {
    const countdown = activeCountdowns.get(channelId);
    if (countdown) {
      clearInterval(countdown.interval);
      activeCountdowns.delete(channelId);
    }
  },
  
  /**
   * Format the remaining time in a human-readable format
   * @param {number} timeLeft - Time left in milliseconds
   * @returns {string} - Formatted time string
   */
  formatRemainingTime(timeLeft) {
    // Convert to seconds
    const seconds = Math.floor(timeLeft / 1000);
    
    // Calculate hours, minutes, and remaining seconds
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    // Format the time string
    const parts = [];
    if (hours > 0) {
      parts.push(`${hours}h`);
    }
    if (minutes > 0 || hours > 0) {
      parts.push(`${minutes}m`);
    }
    parts.push(`${remainingSeconds}s`);
    
    return parts.join(' ');
  }
};