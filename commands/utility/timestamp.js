const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timestamp')
    .setDescription('Convert a date and time to a Discord timestamp')
    .addSubcommand(subcommand =>
      subcommand
        .setName('fromdate')
        .setDescription('Create a timestamp from a specific date and time')
        .addStringOption(option =>
          option.setName('date')
            .setDescription('The date in YYYY-MM-DD format (e.g., 2025-12-31)')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('time')
            .setDescription('The time in HH:MM format (e.g., 23:59)')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('timezone')
            .setDescription('Timezone offset from UTC (e.g., +0, -5, +5:30)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('fromduration')
        .setDescription('Create a timestamp from a duration from now')
        .addIntegerOption(option =>
          option.setName('days')
            .setDescription('Number of days')
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(365))
        .addIntegerOption(option =>
          option.setName('hours')
            .setDescription('Number of hours')
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(23))
        .addIntegerOption(option =>
          option.setName('minutes')
            .setDescription('Number of minutes')
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(59)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('now')
        .setDescription('Create a timestamp for the current time')),
  
  cooldown: 5,
  
  /**
   * Executes the timestamp command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const subcommand = interaction.options.getSubcommand();
      let timestamp;
      
      if (subcommand === 'fromdate') {
        // Get date and time options
        const dateStr = interaction.options.getString('date');
        const timeStr = interaction.options.getString('time');
        const timezoneStr = interaction.options.getString('timezone') || '+0';
        
        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          return interaction.editReply('Invalid date format. Please use YYYY-MM-DD format (e.g., 2025-12-31).');
        }
        
        // Validate time format (HH:MM)
        if (!/^\d{1,2}:\d{2}$/.test(timeStr)) {
          return interaction.editReply('Invalid time format. Please use HH:MM format (e.g., 23:59).');
        }
        
        // Validate timezone format (+/-X or +/-X:YY)
        if (!/^[+-]\d{1,2}(:\d{2})?$/.test(timezoneStr)) {
          return interaction.editReply('Invalid timezone format. Please use +X or -X format (e.g., +0, -5, +5:30).');
        }
        
        // Parse timezone offset
        let timezoneOffsetHours = 0;
        if (timezoneStr.includes(':')) {
          const [hours, minutes] = timezoneStr.substring(1).split(':').map(Number);
          timezoneOffsetHours = parseInt(timezoneStr.charAt(0) + hours);
          timezoneOffsetHours += parseInt(timezoneStr.charAt(0) + (minutes / 60));
        } else {
          timezoneOffsetHours = parseInt(timezoneStr);
        }
        
        // Create date object
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hours, minutes] = timeStr.split(':').map(Number);
        
        const date = new Date(Date.UTC(year, month - 1, day, hours, minutes));
        // Adjust for timezone
        date.setTime(date.getTime() - (timezoneOffsetHours * 60 * 60 * 1000));
        
        // Set the timestamp
        timestamp = Math.floor(date.getTime() / 1000);
      } else if (subcommand === 'fromduration') {
        const days = interaction.options.getInteger('days') || 0;
        const hours = interaction.options.getInteger('hours') || 0;
        const minutes = interaction.options.getInteger('minutes') || 0;
        
        // Ensure at least one value is provided
        if (days === 0 && hours === 0 && minutes === 0) {
          return interaction.editReply('Please provide at least one non-zero duration value (days, hours, or minutes).');
        }
        
        // Calculate target time
        const now = new Date();
        now.setDate(now.getDate() + days);
        now.setHours(now.getHours() + hours);
        now.setMinutes(now.getMinutes() + minutes);
        
        // Set the timestamp
        timestamp = Math.floor(now.getTime() / 1000);
      } else if (subcommand === 'now') {
        // Current time
        timestamp = Math.floor(Date.now() / 1000);
      }
      
      // Create the different timestamp formats
      const formats = [
        { name: 'Short Time', format: 't', example: `<t:${timestamp}:t>`, result: `<t:${timestamp}:t>` },
        { name: 'Long Time', format: 'T', example: `<t:${timestamp}:T>`, result: `<t:${timestamp}:T>` },
        { name: 'Short Date', format: 'd', example: `<t:${timestamp}:d>`, result: `<t:${timestamp}:d>` },
        { name: 'Long Date', format: 'D', example: `<t:${timestamp}:D>`, result: `<t:${timestamp}:D>` },
        { name: 'Short Date/Time', format: 'f', example: `<t:${timestamp}:f>`, result: `<t:${timestamp}:f>` },
        { name: 'Long Date/Time', format: 'F', example: `<t:${timestamp}:F>`, result: `<t:${timestamp}:F>` },
        { name: 'Relative Time', format: 'R', example: `<t:${timestamp}:R>`, result: `<t:${timestamp}:R>` }
      ];
      
      // Build the formatted output for each format
      let formatLines = '';
      formats.forEach(format => {
        formatLines += `**${format.name}** (\`:${format.format}\`)\n${format.result}\n\`${format.example}\`\n\n`;
      });
      
      // Create the embed
      const embed = new EmbedBuilder()
        .setTitle('Discord Timestamp Formatter')
        .setDescription('Copy and paste these timestamps into your messages. They will automatically update for each user based on their timezone.')
        .addFields(
          { name: 'Timestamp Value', value: `\`${timestamp}\``, inline: false },
          { name: 'Formatted Timestamps', value: formatLines, inline: false }
        )
        .setColor(config.embedColor)
        .setFooter({ text: 'Discord uses Unix timestamps (seconds since Jan 1, 1970)' })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      logger.info(`User ${interaction.user.tag} used timestamp command with ${subcommand} option`);
    } catch (error) {
      logger.error(`Error executing timestamp command: ${error.message}`);
      await interaction.editReply('An error occurred while creating the timestamp. Please check your inputs and try again.');
    }
  }
};
