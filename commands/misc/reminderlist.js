const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const Database = require('../../utils/database');
const config = require('../../config.json');

// Create a database for reminders
const remindersDb = new Database('reminders.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reminderlist')
    .setDescription('List all your active reminders')
    .addBooleanOption(option =>
      option.setName('all')
        .setDescription('Show all server reminders instead of just yours (Admin only)'))  
    .addBooleanOption(option =>
      option.setName('sort_by_time')
        .setDescription('Sort reminders by time (default is by creation date)')),

  cooldown: 10,

  /**
   * Execute the reminderlist command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Check if the user wants to see all reminders
      const showAll = interaction.options.getBoolean('all') || false;
      const sortByTime = interaction.options.getBoolean('sort_by_time') || false;
      
      // If showing all reminders, check if user has administrator permissions
      if (showAll && !interaction.member.permissions.has('Administrator')) {
        return interaction.editReply('You need Administrator permissions to view all reminders.');
      }
      
      // Get all reminders from the database
      const allReminders = remindersDb.read() || [];
      
      // Filter reminders by user ID if not showing all
      const userReminders = showAll 
        ? allReminders 
        : allReminders.filter(reminder => reminder.userId === interaction.user.id);
      
      if (userReminders.length === 0) {
        return interaction.editReply(`You have no active reminders.${showAll ? ' No one in the server has any reminders.' : ' Use /remind to create one!'}`); 
      }
      
      // Sort reminders based on user preference
      userReminders.sort((a, b) => {
        if (sortByTime) {
          return a.remindAt - b.remindAt;
        } else {
          return a.createdAt - b.createdAt;
        }
      });
      
      // Create an embed for the reminders
      const embed = new EmbedBuilder()
        .setTitle(`${showAll ? 'All Server' : 'Your'} Reminders`)
        .setColor(config.embedColor || '#3498db')
        .setDescription(`You have ${userReminders.length} active reminder${userReminders.length !== 1 ? 's' : ''}.`)
        .setFooter({ text: `Sorted by ${sortByTime ? 'time' : 'creation date'} • Use /remind delete to remove a reminder` })
        .setTimestamp();
      
      // Create fields for each reminder (maximum 25 due to Discord limitations)
      const maxReminders = Math.min(userReminders.length, 25);
      
      for (let i = 0; i < maxReminders; i++) {
        const reminder = userReminders[i];
        const reminderTime = new Date(reminder.remindAt);
        const timeLeft = reminder.remindAt - Date.now();
        
        let status = '';
        if (timeLeft <= 0) {
          status = '🔔 **Delivering soon**';
        } else {
          const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          
          if (days > 0) {
            status = `⏳ **${days}d ${hours}h ${minutes}m left**`;
          } else if (hours > 0) {
            status = `⏳ **${hours}h ${minutes}m left**`;
          } else {
            status = `⏳ **${minutes}m left**`;
          }
        }
        
        let fieldValue = `${reminder.message}`;
        fieldValue += `\n${status}`;
        fieldValue += `\nDelivery: <t:${Math.floor(reminder.remindAt / 1000)}:F>`;
        
        if (showAll) {
          fieldValue += `\nUser: <@${reminder.userId}>`;
        }
        
        embed.addFields({ 
          name: `Reminder #${i + 1} (ID: ${reminder.id.slice(0, 8)})`, 
          value: fieldValue,
          inline: false
        });
      }
      
      // If there are more reminders than we can display, add a note
      if (userReminders.length > 25) {
        embed.addFields({ 
          name: 'Note', 
          value: `Showing 25/${userReminders.length} reminders due to Discord limitations.`,
          inline: false
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
      logger.info(`User ${interaction.user.tag} viewed their reminder list`);
    } catch (error) {
      logger.error(`Error listing reminders: ${error.message}`);
      await interaction.editReply('An error occurred while listing your reminders.');
    }
  }
};