const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('../../utils/database');
const logger = require('../../utils/logger');
const EmbedCreator = require('../../utils/embedCreator');

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
        .setName('addrole')
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
    let subcommand;
    try {
      subcommand = interaction.options.getSubcommand();
      logger.info(`Executing antiping subcommand: ${subcommand}`);
    } catch (error) {
      logger.error(`Error getting subcommand: ${error.message}`);
      
      // Send a helpful error message with available commands
      const errorEmbed = EmbedCreator.error(
        'Missing Subcommand',
        'Please specify one of the available anti-ping subcommands:'
      );
      
      errorEmbed.addFields({ 
        name: 'Available Subcommands', 
        value: 
          '• `/antiping view` - View current configuration\n' +
          '• `/antiping enable` - Enable the anti-ping system\n' +
          '• `/antiping disable` - Disable the anti-ping system\n' +
          '• `/antiping addrole` - Set a role that cannot be pinged\n' +
          '• `/antiping addbypassrole` - Set a role that can ping protected roles\n' +
          '• `/antiping muteduration` - Set the timeout duration\n' +
          '• `/antiping message` - Set the warning message\n' +
          '• `/antiping log` - Set the log channel'
      });
      
      return await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true
      });
    }
    
    const config = antipingDb.read();

    switch (subcommand) {
      case 'enable':
        config.enabled = true;
        antipingDb.write(config);
        
        const enableEmbed = EmbedCreator.success(
          'Anti-Ping System Enabled',
          'The anti-ping protection system has been successfully enabled.'
        );
        
        await interaction.reply({
          embeds: [enableEmbed],
          ephemeral: true
        });
        
        logger.info(`Anti-ping system enabled by ${interaction.user.tag}`);
        break;

      case 'disable':
        config.enabled = false;
        antipingDb.write(config);
        
        const disableEmbed = EmbedCreator.warning(
          'Anti-Ping System Disabled',
          'The anti-ping protection system has been disabled. Protected users are no longer protected from pings.'
        );
        
        await interaction.reply({
          embeds: [disableEmbed],
          ephemeral: true
        });
        
        logger.info(`Anti-ping system disabled by ${interaction.user.tag}`);
        break;
        
      case 'addrole': // This is the officially registered command name
        const protectedRole = interaction.options.getRole('role');
        config.noPingRoleId = protectedRole.id;
        antipingDb.write(config);
        
        const protectedRoleEmbed = EmbedCreator.info(
          'Protected Role Set',
          `Set protected role to **${protectedRole.name}**.\nMembers with this role cannot be pinged unless by users with bypass role.`
        );
        
        await interaction.reply({
          embeds: [protectedRoleEmbed],
          ephemeral: true
        });
        
        logger.info(`Protected role set to ${protectedRole.name} (${protectedRole.id}) by ${interaction.user.tag}`);
        break;
        
      case 'addbypassrole':
        const bypassRole = interaction.options.getRole('role');
        config.bypassRoleId = bypassRole.id;
        antipingDb.write(config);
        
        const bypassRoleEmbed = EmbedCreator.info(
          'Bypass Role Set',
          `Set bypass role to **${bypassRole.name}**.\nMembers with this role can ping protected roles.`
        );
        
        await interaction.reply({
          embeds: [bypassRoleEmbed],
          ephemeral: true
        });
        
        logger.info(`Bypass role set to ${bypassRole.name} (${bypassRole.id}) by ${interaction.user.tag}`);
        break;
        
      case 'muteduration':
        const minutes = interaction.options.getInteger('minutes');
        config.muteDuration = minutes;
        antipingDb.write(config);
        
        // Format duration for better readability
        let durationText = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        if (minutes >= 60) {
          const hours = Math.floor(minutes / 60);
          const remainingMinutes = minutes % 60;
          durationText = `${hours} hour${hours !== 1 ? 's' : ''}`;
          if (remainingMinutes > 0) {
            durationText += ` and ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
          }
        }
        
        const durationEmbed = EmbedCreator.info(
          'Timeout Duration Updated',
          `Set timeout duration to **${durationText}** for anti-ping violations.`
        );
        
        await interaction.reply({
          embeds: [durationEmbed],
          ephemeral: true
        });
        
        logger.info(`Timeout duration set to ${minutes} minutes by ${interaction.user.tag}`);
        break;
        
      case 'message':
        const message = interaction.options.getString('text');
        config.warnMessage = message;
        antipingDb.write(config);
        
        const messageEmbed = EmbedCreator.info(
          'Warning Message Updated',
          'The warning message has been updated.'
        );
        
        messageEmbed.addFields({ name: 'New Message', value: message });
        
        await interaction.reply({
          embeds: [messageEmbed],
          ephemeral: true
        });
        
        logger.info(`Warning message updated by ${interaction.user.tag}`);
        break;
        
      case 'log':
        const channel = interaction.options.getChannel('channel');
        
        // Check if channel is a text channel
        if (channel.type !== 0) {
          return interaction.reply({
            embeds: [EmbedCreator.error(
              'Invalid Channel Type',
              'You can only set text channels as log channels.'
            )],
            ephemeral: true
          });
        }
        
        config.logChannelId = channel.id;
        antipingDb.write(config);
        
        const logEmbed = EmbedCreator.info(
          'Log Channel Set',
          `Anti-ping violations will now be logged in ${channel}.`
        );
        
        await interaction.reply({
          embeds: [logEmbed],
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
        
        // Create fields for the embed
        const fields = [
          { name: 'Status', value: config.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Protected Role', value: nopingRoleName, inline: true },
          { name: 'Bypass Role', value: bypassRoleName, inline: true },
          { name: 'Timeout Duration', value: `${config.muteDuration} minutes`, inline: true },
          { name: 'Log Channel', value: logChannelName, inline: true },
          { name: 'Warning Message', value: config.warnMessage || 'Not set' }
        ];
        
        // Create the embed using our utility
        const statusEmbed = EmbedCreator.create({
          title: '🛡️ Anti-Ping Protection System',
          description: `The anti-ping system ${config.enabled ? 'is **enabled**' : 'is currently **disabled**'}`,
          color: config.enabled ? '#00FF00' : '#FF0000',
          fields: fields,
          footer: 'Use /antiping commands to configure the system'
        });
        
        await interaction.reply({
          embeds: [statusEmbed],
          ephemeral: true
        });
        break;
        
      default:
        // Log this case to help diagnose the issue
        logger.error(`Unknown antiping subcommand received: "${subcommand}" from user ${interaction.user.tag}`);
        
        // Send a helpful error message with available commands
        const errorEmbed = EmbedCreator.error(
          'Unknown Subcommand',
          'Please use one of the available anti-ping commands:'
        );
        
        errorEmbed.addFields({ 
          name: 'Available Subcommands', 
          value: 
            '• `/antiping view` - View current configuration\n' +
            '• `/antiping enable` - Enable the anti-ping system\n' +
            '• `/antiping disable` - Disable the anti-ping system\n' +
            '• `/antiping addrole` - Set a role that cannot be pinged\n' +
            '• `/antiping addbypassrole` - Set a role that can ping protected roles\n' +
            '• `/antiping muteduration` - Set the timeout duration\n' +
            '• `/antiping message` - Set the warning message\n' +
            '• `/antiping log` - Set the log channel'
        });
        
        await interaction.reply({
          embeds: [errorEmbed],
          ephemeral: true
        });
    }
  }
};