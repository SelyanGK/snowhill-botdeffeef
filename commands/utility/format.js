const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('format')
    .setDescription('Format and style text for Discord')
    .addSubcommand(subcommand =>
      subcommand
        .setName('text')
        .setDescription('Format text with Discord markdown')
        .addStringOption(option =>
          option.setName('style')
            .setDescription('The style to apply')
            .setRequired(true)
            .addChoices(
              { name: 'Bold', value: 'bold' },
              { name: 'Italic', value: 'italic' },
              { name: 'Underline', value: 'underline' },
              { name: 'Strikethrough', value: 'strikethrough' },
              { name: 'Code', value: 'code' },
              { name: 'Code Block', value: 'codeblock' },
              { name: 'Spoiler', value: 'spoiler' },
              { name: 'Quote', value: 'quote' },
              { name: 'Block Quote', value: 'blockquote' }
            ))
        .addStringOption(option =>
          option.setName('content')
            .setDescription('The text to format')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('timestamp')
        .setDescription('Create a dynamic timestamp')
        .addStringOption(option =>
          option.setName('style')
            .setDescription('How to display the timestamp')
            .setRequired(true)
            .addChoices(
              { name: 'Short Time (3:15 PM)', value: 't' },
              { name: 'Long Time (3:15:30 PM)', value: 'T' },
              { name: 'Short Date (05/02/2025)', value: 'd' },
              { name: 'Long Date (May 2, 2025)', value: 'D' },
              { name: 'Short Date/Time (May 2, 2025 3:15 PM)', value: 'f' },
              { name: 'Long Date/Time (Friday, May 2, 2025 3:15 PM)', value: 'F' },
              { name: 'Relative (in 3 hours, 3 hours ago)', value: 'R' }
            ))
        .addIntegerOption(option =>
          option.setName('minutes')
            .setDescription('Minutes from now (use negative for past)')
            .setRequired(false))
        .addIntegerOption(option =>
          option.setName('hours')
            .setDescription('Hours from now (use negative for past)')
            .setRequired(false))
        .addIntegerOption(option =>
          option.setName('days')
            .setDescription('Days from now (use negative for past)')
            .setRequired(false)))  
    .addSubcommand(subcommand =>
      subcommand
        .setName('help')
        .setDescription('Show formatting help and examples')),
  
  cooldown: 5,
  
  /**
   * Executes the format command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'text') {
      await this.formatText(interaction);
    } else if (subcommand === 'timestamp') {
      await this.formatTimestamp(interaction);
    } else if (subcommand === 'help') {
      await this.showHelp(interaction);
    }
    
    logger.info(`User ${interaction.user.tag} used format command: ${subcommand}`);
  },
  
  /**
   * Format text with Discord markdown
   * @param {Interaction} interaction - The interaction
   */
  async formatText(interaction) {
    const style = interaction.options.getString('style');
    const content = interaction.options.getString('content');
    
    let formattedText;
    let description;
    
    switch (style) {
      case 'bold':
        formattedText = `**${content}**`;
        description = 'Surround your text with double asterisks';
        break;
      case 'italic':
        formattedText = `*${content}*`;
        description = 'Surround your text with single asterisks';
        break;
      case 'underline':
        formattedText = `__${content}__`;
        description = 'Surround your text with double underscores';
        break;
      case 'strikethrough':
        formattedText = `~~${content}~~`;
        description = 'Surround your text with double tildes';
        break;
      case 'code':
        formattedText = `\`${content}\``;
        description = 'Surround your text with backticks';
        break;
      case 'codeblock':
        formattedText = `\`\`\`\n${content}\n\`\`\``;
        description = 'Surround your text with triple backticks';
        break;
      case 'spoiler':
        formattedText = `||${content}||`;
        description = 'Surround your text with double pipes';
        break;
      case 'quote':
        formattedText = `> ${content}`;
        description = 'Start your text with a greater-than sign';
        break;
      case 'blockquote':
        formattedText = `>>> ${content}`;
        description = 'Start your text with three greater-than signs';
        break;
      default:
        formattedText = content;
        description = 'No formatting applied';
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📝 Formatted Text')
      .setDescription(`**Preview:**\n${formattedText}`)
      .addFields(
        { name: 'Style', value: style.charAt(0).toUpperCase() + style.slice(1), inline: true },
        { name: 'How to Type It', value: description, inline: true },
        { name: 'Copy This', value: `\`${formattedText.replace(/`/g, '\\')}\`` }
      )
      .setColor(config.embedColor || '#3498db')
      .setFooter({ text: 'Use /format help for more formatting options' })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  },
  
  /**
   * Format a timestamp
   * @param {Interaction} interaction - The interaction
   */
  async formatTimestamp(interaction) {
    const style = interaction.options.getString('style');
    const minutes = interaction.options.getInteger('minutes') || 0;
    const hours = interaction.options.getInteger('hours') || 0;
    const days = interaction.options.getInteger('days') || 0;
    
    // Calculate the timestamp
    const now = new Date();
    const totalMilliseconds = (minutes * 60 + hours * 60 * 60 + days * 24 * 60 * 60) * 1000;
    const targetDate = new Date(now.getTime() + totalMilliseconds);
    const unixTimestamp = Math.floor(targetDate.getTime() / 1000);
    
    // Create the Discord timestamp format
    const discordTimestamp = `<t:${unixTimestamp}:${style}>`;
    
    // Get a human-readable description of when this timestamp is
    let timeDescription = '';
    if (totalMilliseconds === 0) {
      timeDescription = 'Current time';
    } else {
      const parts = [];
      if (days !== 0) parts.push(`${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`);
      if (hours !== 0) parts.push(`${Math.abs(hours)} hour${Math.abs(hours) !== 1 ? 's' : ''}`);
      if (minutes !== 0) parts.push(`${Math.abs(minutes)} minute${Math.abs(minutes) !== 1 ? 's' : ''}`);
      
      if (parts.length === 0) {
        timeDescription = 'Current time';
      } else {
        timeDescription = `${totalMilliseconds > 0 ? 'In' : ''} ${parts.join(', ')} ${totalMilliseconds < 0 ? 'ago' : ''}`;
      }
    }
    
    // Get style description
    let styleDescription;
    switch (style) {
      case 't': styleDescription = 'Short Time (3:15 PM)'; break;
      case 'T': styleDescription = 'Long Time (3:15:30 PM)'; break;
      case 'd': styleDescription = 'Short Date (05/02/2025)'; break;
      case 'D': styleDescription = 'Long Date (May 2, 2025)'; break;
      case 'f': styleDescription = 'Short Date/Time (May 2, 2025 3:15 PM)'; break;
      case 'F': styleDescription = 'Long Date/Time (Friday, May 2, 2025 3:15 PM)'; break;
      case 'R': styleDescription = 'Relative (in 3 hours, 3 hours ago)'; break;
      default: styleDescription = 'Unknown style';
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📅 Dynamic Timestamp')
      .setDescription(`**Preview:** ${discordTimestamp}`)
      .addFields(
        { name: 'When', value: timeDescription, inline: true },
        { name: 'Style', value: styleDescription, inline: true },
        { name: 'Copy This', value: `\`${discordTimestamp}\`` }
      )
      .setColor(config.embedColor || '#3498db')
      .setFooter({ text: 'Discord timestamps automatically adjust to each user\'s timezone' })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  },
  
  /**
   * Show formatting help and examples
   * @param {Interaction} interaction - The interaction
   */
  async showHelp(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📖 Discord Text Formatting Guide')
      .setDescription('Discord supports various text formatting options using Markdown syntax. Here\'s how to use them:')
      .addFields(
        { name: 'Basic Formatting', value: 
          '**Bold**: `**text**`\n' +
          '*Italic*: `*text*`\n' +
          '__Underline__: `__text__`\n' +
          '~~Strikethrough~~: `~~text~~`\n' +
          '`Code`: \`\`text\`\`'
        },
        { name: 'Advanced Formatting', value: 
          '```Code Block```\n`\`\`\`text\`\`\``\n' +
          '> Quote\n`> text`\n' +
          '>>> Block Quote\n`>>> text`\n' +
          '||Spoiler|| `||text||`'
        },
        { name: 'Combinations', value: 
          '***Bold Italic***: `***text***`\n' +
          '__*Underlined Italic*__: `__*text*__`\n' +
          '**__Bold and Underlined__**: `**__text__**`\n' +
          '~~**Strikethrough Bold**~~: `~~**text**~~`'
        },
        { name: 'Dynamic Timestamps', value: 
          'Creates timestamps that adapt to the viewer\'s timezone.\n' +
          'Example: <t:1714756800:F> shows as the user\'s local time\n' +
          'Use `/format timestamp` to generate these easily\n' +
          'Format: `<t:UNIX_TIMESTAMP:STYLE_CODE>`'
        },
        { name: 'Lists', value: 
          '• Bullet point: Type a dash or asterisk followed by a space\n' +
          '1. Numbered list: Type a number followed by a period and space'
        }
      )
      .setColor(config.embedColor || '#3498db')
      .setFooter({ text: 'Use /format text or /format timestamp to generate formatted text' })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
};