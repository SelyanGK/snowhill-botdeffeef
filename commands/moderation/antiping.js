const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
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
        .setDescription('Enable or disable the anti-ping system')
        .addBooleanOption(option =>
          option.setName('status')
            .setDescription('Enable or disable the system')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('noping')
        .setDescription('Set the no-ping role')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role that cannot be pinged')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('bypass')
        .setDescription('Set the bypass role')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role that can ping no-ping roles')
            .setRequired(true)))
    // Removed mute role subcommand as we're only using Discord's timeout system
    .addSubcommand(subcommand =>
      subcommand
        .setName('duration')
        .setDescription('Set the mute duration')
        .addIntegerOption(option =>
          option.setName('minutes')
            .setDescription('Duration of the mute in minutes')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1440)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('message')
        .setDescription('Set the warning message')
        .addStringOption(option =>
          option.setName('text')
            .setDescription('Message sent to users who are muted')
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
        .setName('status')
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
        const status = interaction.options.getBoolean('status');
        config.enabled = status;
        antipingDb.write(config);
        
        await interaction.reply({
          content: `Anti-ping system has been ${status ? 'enabled' : 'disabled'}.`,
          ephemeral: true
        });
        
        logger.info(`Anti-ping system ${status ? 'enabled' : 'disabled'} by ${interaction.user.tag}`);
        break;
        
      case 'noping':
        const nopingRole = interaction.options.getRole('role');
        config.noPingRoleId = nopingRole.id;
        antipingDb.write(config);
        
        await interaction.reply({
          content: `Set no-ping role to ${nopingRole.name}.`,
          ephemeral: true
        });
        
        logger.info(`No-ping role set to ${nopingRole.name} (${nopingRole.id}) by ${interaction.user.tag}`);
        break;
        
      case 'bypass':
        const bypassRole = interaction.options.getRole('role');
        config.bypassRoleId = bypassRole.id;
        antipingDb.write(config);
        
        await interaction.reply({
          content: `Set bypass role to ${bypassRole.name}.`,
          ephemeral: true
        });
        
        logger.info(`Bypass role set to ${bypassRole.name} (${bypassRole.id}) by ${interaction.user.tag}`);
        break;
        
      // Mute role case removed as we're using timeout only
        
      case 'duration':
        const minutes = interaction.options.getInteger('minutes');
        config.muteDuration = minutes;
        antipingDb.write(config);
        
        await interaction.reply({
          content: `Set mute duration to ${minutes} minutes.`,
          ephemeral: true
        });
        
        logger.info(`Mute duration set to ${minutes} minutes by ${interaction.user.tag}`);
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
          content: `Set log channel to ${channel}.`,
          ephemeral: true
        });
        
        logger.info(`Log channel set to ${channel.name} (${channel.id}) by ${interaction.user.tag}`);
        break;
        
      case 'status':
        const nopingRoleName = config.noPingRoleId 
          ? interaction.guild.roles.cache.get(config.noPingRoleId)?.name || 'Unknown Role'
          : 'Not set';
          
        const bypassRoleName = config.bypassRoleId
          ? interaction.guild.roles.cache.get(config.bypassRoleId)?.name || 'Unknown Role'
          : 'Not set';
          
        // Mute role removed as we're using timeouts only
          
        const logChannelName = config.logChannelId
          ? interaction.guild.channels.cache.get(config.logChannelId)?.toString() || 'Unknown Channel'
          : 'Not set';
        
        await interaction.reply({
          embeds: [{
            title: 'Anti-Ping System Status',
            fields: [
              { name: 'Enabled', value: config.enabled ? 'Yes' : 'No', inline: true },
              { name: 'No-Ping Role', value: nopingRoleName, inline: true },
              { name: 'Bypass Role', value: bypassRoleName, inline: true },
              { name: 'Timeout Duration', value: `${config.muteDuration} minutes`, inline: true },
              { name: 'Log Channel', value: logChannelName, inline: true },
              { name: 'Warning Message', value: config.warnMessage || 'Not set' }
            ],
            color: 0x3498db
          }],
          ephemeral: true
        });
        break;
    }
  }
};