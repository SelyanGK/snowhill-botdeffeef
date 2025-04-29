const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Database = require('../../utils/database');
const logger = require('../../utils/logger');

// Anti-ping database
const antipingDb = new Database('antiping.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiping')
    .setDescription('Configure the anti-ping system')
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Enable the anti-ping system'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable the anti-ping system'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('addprotectedrole')
        .setDescription('Add a role that cannot be pinged')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role that cannot be pinged')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('addbypassrole')
        .setDescription('Add a role that can ping protected roles')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role that can ping protected roles')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('muteduration')
        .setDescription('Set the timeout duration')
        .addIntegerOption(option =>
          option.setName('minutes')
            .setDescription('Duration of the timeout in minutes')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1440)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('message')
        .setDescription('Set the warning message')
        .addStringOption(option =>
          option.setName('text')
            .setDescription('Message sent to users who violate the rules')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('log')
        .setDescription('Set the log channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('Channel where violations are logged')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View the current anti-ping configuration'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  cooldown: 5,

  /**
   * Executes the anti-ping command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const config = antipingDb.read();

    switch (subcommand) {
      case 'enable':
        config.enabled = true;
        antipingDb.write(config);
        
        await interaction.reply({
          content: `Anti-ping protection system has been **enabled**.`,
          ephemeral: true
        });
        
        logger.info(`Anti-ping system enabled by ${interaction.user.tag}`);
        break;

      case 'disable':
        config.enabled = false;
        antipingDb.write(config);
        
        await interaction.reply({
          content: `Anti-ping protection system has been **disabled**.`,
          ephemeral: true
        });
        
        logger.info(`Anti-ping system disabled by ${interaction.user.tag}`);
        break;
        
      case 'addprotectedrole':
        const protectedRole = interaction.options.getRole('role');
        config.noPingRoleId = protectedRole.id;
        antipingDb.write(config);
        
        await interaction.reply({
          content: `Set protected role to **${protectedRole.name}**. Members with this role cannot be pinged unless by users with bypass role.`,
          ephemeral: true
        });
        
        logger.info(`Protected role set to ${protectedRole.name} (${protectedRole.id}) by ${interaction.user.tag}`);
        break;
        
      case 'addbypassrole':
        const bypassRole = interaction.options.getRole('role');
        config.bypassRoleId = bypassRole.id;
        antipingDb.write(config);
        
        await interaction.reply({
          content: `Set bypass role to **${bypassRole.name}**. Members with this role can ping protected roles.`,
          ephemeral: true
        });
        
        logger.info(`Bypass role set to ${bypassRole.name} (${bypassRole.id}) by ${interaction.user.tag}`);
        break;
        
      case 'muteduration':
        const minutes = interaction.options.getInteger('minutes');
        config.muteDuration = minutes;
        antipingDb.write(config);
        
        await interaction.reply({
          content: `Set timeout duration to **${minutes} minutes** for anti-ping violations.`,
          ephemeral: true
        });
        
        logger.info(`Timeout duration set to ${minutes} minutes by ${interaction.user.tag}`);
        break;
        
      case 'message':
        const message = interaction.options.getString('text');
        config.warnMessage = message;
        antipingDb.write(config);
        
        await interaction.reply({
          content: `Set warning message to: "${message}"`,
          ephemeral: true
        });
        
        logger.info(`Warning message updated by ${interaction.user.tag}`);
        break;
        
      case 'log':
        const channel = interaction.options.getChannel('channel');
        
        // Check if channel is a text channel
        if (channel.type !== 0) {
          return interaction.reply({
            content: 'You can only set text channels as log channels.',
            ephemeral: true
          });
        }
        
        config.logChannelId = channel.id;
        antipingDb.write(config);
        
        await interaction.reply({
          content: `Anti-ping violations will now be logged in ${channel}.`,
          ephemeral: true
        });
        
        logger.info(`Log channel set to ${channel.name} (${channel.id}) by ${interaction.user.tag}`);
        break;
        
      case 'view':
        const nopingRoleName = config.noPingRoleId 
          ? interaction.guild.roles.cache.get(config.noPingRoleId)?.name || 'Unknown Role'
          : 'Not set';
          
        const bypassRoleName = config.bypassRoleId
          ? interaction.guild.roles.cache.get(config.bypassRoleId)?.name || 'Unknown Role'
          : 'Not set';
          
        const logChannelName = config.logChannelId
          ? interaction.guild.channels.cache.get(config.logChannelId)?.toString() || 'Unknown Channel'
          : 'Not set';
        
        const embed = new EmbedBuilder()
          .setTitle('🛡️ Anti-Ping Protection System')
          .setDescription(`The anti-ping system ${config.enabled ? 'is **enabled**' : 'is currently **disabled**'}`)
          .addFields([
            { name: 'Status', value: config.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Protected Role', value: nopingRoleName, inline: true },
            { name: 'Bypass Role', value: bypassRoleName, inline: true },
            { name: 'Timeout Duration', value: `${config.muteDuration} minutes`, inline: true },
            { name: 'Log Channel', value: logChannelName, inline: true },
            { name: 'Warning Message', value: config.warnMessage || 'Not set' }
          ])
          .setColor(config.enabled ? 0x00FF00 : 0xFF0000)
          .setFooter({ text: 'Use /antiping commands to configure the system' })
          .setTimestamp();
        
        await interaction.reply({
          embeds: [embed],
          ephemeral: true
        });
        break;
        
      default:
        await interaction.reply({
          content: 'Unknown subcommand. Please use one of the available anti-ping commands.',
          ephemeral: true
        });
    }
  }
};