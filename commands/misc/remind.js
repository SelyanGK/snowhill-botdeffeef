const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');
const Database = require('../../utils/database');

// Reminders database
const remindersDb = new Database('reminders.json');

// Time units in milliseconds
const TIME_UNITS = {
  's': 1000,           // second
  'm': 60 * 1000,      // minute
  'h': 60 * 60 * 1000, // hour
  'd': 24 * 60 * 60 * 1000, // day
  'w': 7 * 24 * 60 * 60 * 1000 // week
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set a reminder')
    .addSubcommand(subcommand =>
      subcommand
        .setName('me')
        .setDescription('Create a new reminder')
        .addStringOption(option =>
          option.setName('time')
            .setDescription('When to remind you (e.g., 10m, 2h, 1d, 1w)')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('message')
            .setDescription('What to remind you about')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List your active reminders'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('cancel')
        .setDescription('Cancel a reminder')
        .addStringOption(option =>
          option.setName('id')
            .setDescription('The ID of the reminder to cancel')
            .setRequired(true))),
  
  cooldown: 5,
  
  /**
   * Executes the remind command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === 'me') {
        await this.createReminder(interaction);
      } else if (subcommand === 'list') {
        await this.listReminders(interaction);
      } else if (subcommand === 'cancel') {
        await this.cancelReminder(interaction);
      }
    } catch (error) {
      logger.error(`Error executing remind command: ${error.message}`);
      await interaction.editReply('An error occurred while processing your reminder. Please try again.');
    }
  },
  
  /**
   * Creates a new reminder
   * @param {Interaction} interaction - The interaction
   */
  async createReminder(interaction) {
    const timeString = interaction.options.getString('time');
    const message = interaction.options.getString('message');
    
    // Parse the time string
    const parsedTime = this.parseTimeString(timeString);
    
    if (!parsedTime) {
      return interaction.editReply('Invalid time format. Please use a format like 10m, 2h, 1d, or 1w.');
    }
    
    // Check if the time is too short or too long
    if (parsedTime < 10 * 1000) { // 10 seconds minimum
      return interaction.editReply('Reminder time must be at least 10 seconds.');
    }
    
    if (parsedTime > 4 * 7 * 24 * 60 * 60 * 1000) { // 4 weeks maximum
      return interaction.editReply('Reminder time cannot exceed 4 weeks.');
    }
    
    // Calculate the reminder time
    const now = Date.now();
    const reminderTime = now + parsedTime;
    
    // Generate a unique ID for the reminder
    const reminderId = Math.random().toString(36).substring(2, 10);
    
    // Create the reminder
    const reminder = {
      id: reminderId,
      userId: interaction.user.id,
      channelId: interaction.channelId,
      guildId: interaction.guildId,
      message: message,
      createdAt: now,
      reminderTime: reminderTime,
      completed: false
    };
    
    // Save the reminder
    const reminders = remindersDb.read() || {};
    if (!reminders.active) reminders.active = [];
    reminders.active.push(reminder);
    remindersDb.write(reminders);
    
    // Schedule the reminder
    this.scheduleReminder(reminder, interaction.client);
    
    // Create a confirmation embed
    const embed = new EmbedBuilder()
      .setTitle('Reminder Set')
      .setDescription(`I'll remind you about: **${message}**`)
      .addFields({
        name: 'When',
        value: `<t:${Math.floor(reminderTime / 1000)}:F> (in <t:${Math.floor(reminderTime / 1000)}:R>)`
      })
      .setColor(config.embedColor)
      .setFooter({ text: `Reminder ID: ${reminderId}` })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    logger.info(`User ${interaction.user.tag} set a reminder for ${new Date(reminderTime).toISOString()}`);
  },
  
  /**
   * Lists a user's active reminders
   * @param {Interaction} interaction - The interaction
   */
  async listReminders(interaction) {
    const reminders = remindersDb.read() || {};
    if (!reminders.active) reminders.active = [];
    
    // Filter reminders for the current user
    const userReminders = reminders.active.filter(r => 
      r.userId === interaction.user.id && !r.completed
    );
    
    if (userReminders.length === 0) {
      return interaction.editReply('You don\'t have any active reminders.');
    }
    
    // Sort reminders by time (earliest first)
    userReminders.sort((a, b) => a.reminderTime - b.reminderTime);
    
    // Create a list of reminders
    let description = '';
    for (const reminder of userReminders) {
      description += `**ID:** ${reminder.id}\n`;
      description += `**Reminder:** ${reminder.message}\n`;
      description += `**When:** <t:${Math.floor(reminder.reminderTime / 1000)}:F> (in <t:${Math.floor(reminder.reminderTime / 1000)}:R>)\n\n`;
    }
    
    // Create the embed
    const embed = new EmbedBuilder()
      .setTitle('Your Reminders')
      .setDescription(description)
      .setColor(config.embedColor)
      .setFooter({ text: `Total: ${userReminders.length} active reminder${userReminders.length === 1 ? '' : 's'}` })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  },
  
  /**
   * Cancels a reminder
   * @param {Interaction} interaction - The interaction
   */
  async cancelReminder(interaction) {
    const reminderId = interaction.options.getString('id');
    
    const reminders = remindersDb.read() || {};
    if (!reminders.active) reminders.active = [];
    
    // Find the reminder
    const reminderIndex = reminders.active.findIndex(r => 
      r.id === reminderId && r.userId === interaction.user.id && !r.completed
    );
    
    if (reminderIndex === -1) {
      return interaction.editReply(`Reminder with ID ${reminderId} not found or already completed.`);
    }
    
    // Get the reminder details for the confirmation message
    const reminder = reminders.active[reminderIndex];
    
    // Remove the reminder
    reminders.active.splice(reminderIndex, 1);
    remindersDb.write(reminders);
    
    // Create a confirmation embed
    const embed = new EmbedBuilder()
      .setTitle('Reminder Cancelled')
      .setDescription(`Your reminder has been cancelled.\n\n**Reminder:** ${reminder.message}`)
      .setColor(config.embedColor)
      .setFooter({ text: `Reminder ID: ${reminderId}` })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    logger.info(`User ${interaction.user.tag} cancelled reminder ${reminderId}`);
  },
  
  /**
   * Schedules a reminder to be sent
   * @param {Object} reminder - The reminder object
   * @param {Client} client - The Discord client
   */
  scheduleReminder(reminder, client) {
    const delay = Math.max(0, reminder.reminderTime - Date.now());
    
    // Don't schedule if the reminder time has already passed
    if (delay <= 0) {
      logger.warn(`Reminder ${reminder.id} scheduled time has already passed`);
      return;
    }
    
    setTimeout(async () => {
      try {
        // Check if the reminder still exists and is not completed
        const reminders = remindersDb.read() || {};
        if (!reminders.active) return;
        
        const reminderIndex = reminders.active.findIndex(r => r.id === reminder.id && !r.completed);
        if (reminderIndex === -1) return; // Reminder was cancelled or doesn't exist
        
        // Mark the reminder as completed
        reminders.active[reminderIndex].completed = true;
        remindersDb.write(reminders);
        
        // Get the user and channel
        const user = await client.users.fetch(reminder.userId).catch(() => null);
        if (!user) {
          logger.warn(`Could not find user ${reminder.userId} for reminder ${reminder.id}`);
          return;
        }
        
        // Create the reminder embed
        const embed = new EmbedBuilder()
          .setTitle('Reminder')
          .setDescription(reminder.message)
          .addFields({
            name: 'Set',
            value: `<t:${Math.floor(reminder.createdAt / 1000)}:R>`
          })
          .setColor(config.embedColor)
          .setFooter({ text: `Reminder ID: ${reminder.id}` })
          .setTimestamp();
        
        // Try to send the reminder as a DM
        await user.send({ embeds: [embed] }).catch(async (error) => {
          logger.warn(`Failed to send reminder DM to ${user.tag}: ${error.message}`);
          
          // If DM fails, try to send to the original channel
          try {
            const channel = await client.channels.fetch(reminder.channelId).catch(() => null);
            if (channel && channel.isTextBased()) {
              await channel.send({
                content: `<@${reminder.userId}>, here's your reminder:`,
                embeds: [embed]
              });
            }
          } catch (channelError) {
            logger.error(`Failed to send reminder to channel ${reminder.channelId}: ${channelError.message}`);
          }
        });
        
        logger.info(`Sent reminder ${reminder.id} to user ${user.tag}`);
      } catch (error) {
        logger.error(`Error sending reminder ${reminder.id}: ${error.message}`);
      }
    }, delay);
    
    logger.info(`Scheduled reminder ${reminder.id} for ${new Date(reminder.reminderTime).toISOString()}`);
  },
  
  /**
   * Parses a time string into milliseconds
   * @param {string} timeString - The time string (e.g., 10m, 2h, 1d)
   * @returns {number|null} The time in milliseconds, or null if invalid
   */
  parseTimeString(timeString) {
    // Match numbers followed by a time unit
    const match = timeString.match(/^(\d+)([smhdw])$/);
    if (!match) return null;
    
    const amount = parseInt(match[1], 10);
    const unit = match[2];
    
    if (isNaN(amount) || amount <= 0) return null;
    if (!TIME_UNITS[unit]) return null;
    
    return amount * TIME_UNITS[unit];
  },
  
  /**
   * Loads active reminders when the bot starts
   * @param {Client} client - The Discord client
   */
  loadReminders(client) {
    const reminders = remindersDb.read() || {};
    if (!reminders.active) reminders.active = [];
    
    // Filter out completed reminders and ones that are too old
    const now = Date.now();
    const activeReminders = reminders.active.filter(r => 
      !r.completed && r.reminderTime > now - (24 * 60 * 60 * 1000) // Keep reminders from the last 24 hours
    );
    
    // Schedule all active reminders
    let scheduledCount = 0;
    for (const reminder of activeReminders) {
      this.scheduleReminder(reminder, client);
      scheduledCount++;
    }
    
    // Clean up the reminders array if we filtered any out
    if (activeReminders.length !== reminders.active.length) {
      reminders.active = activeReminders;
      remindersDb.write(reminders);
    }
    
    logger.info(`Loaded ${scheduledCount} active reminders`);
  }
};
