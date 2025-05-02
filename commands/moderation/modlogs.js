const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');
const Database = require('../../utils/database');

// Database for moderation logs
const modlogsDb = new Database('modlogs.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modlogs')
    .setDescription('Advanced moderation logs system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Set up the moderation logs system')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to send moderation logs to')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a moderation log entry')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user who received the moderation action')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('action')
            .setDescription('The type of moderation action')
            .setRequired(true)
            .addChoices(
              { name: 'Warn', value: 'warn' },
              { name: 'Mute/Timeout', value: 'mute' },
              { name: 'Kick', value: 'kick' },
              { name: 'Ban', value: 'ban' },
              { name: 'Unban', value: 'unban' },
              { name: 'Other', value: 'other' }
            ))
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('The reason for the moderation action')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('duration')
            .setDescription('Duration of the action (for mutes/bans) e.g. 1d, 12h, 30m')
            .setRequired(false))
        .addBooleanOption(option =>
          option.setName('silent')
            .setDescription('Whether to silently log without DMing the user')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View moderation logs for a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to view logs for')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('Delete a moderation log entry by ID')
        .addStringOption(option =>
          option.setName('id')
            .setDescription('The ID of the log entry to delete')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View moderation statistics')),

  cooldown: 5,

  /**
   * Executes the modlogs command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'setup') {
        await this.handleSetup(interaction);
      } else if (subcommand === 'add') {
        await this.handleAdd(interaction);
      } else if (subcommand === 'view') {
        await this.handleView(interaction);
      } else if (subcommand === 'delete') {
        await this.handleDelete(interaction);
      } else if (subcommand === 'stats') {
        await this.handleStats(interaction);
      }
    } catch (error) {
      logger.error(`Error executing modlogs command: ${error.message}`);
      await this.sendErrorResponse(interaction, error.message);
    }
  },

  /**
   * Handles the setup subcommand
   * @param {Interaction} interaction - The interaction
   */
  async handleSetup(interaction) {
    await interaction.deferReply();

    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;

    // Initialize or get existing guild settings
    const settings = modlogsDb.read() || {};
    if (!settings[guildId]) {
      settings[guildId] = {
        logChannel: null,
        logs: [],
        stats: {
          warns: 0,
          mutes: 0,
          kicks: 0,
          bans: 0,
          unbans: 0,
          other: 0
        }
      };
    }

    // Update the log channel
    settings[guildId].logChannel = channel.id;
    modlogsDb.write(settings);

    // Create a success embed
    const embed = new EmbedBuilder()
      .setTitle('✅ Moderation Logs Setup')
      .setDescription(`Moderation logs will now be sent to ${channel}`)
      .setColor(config.successColor)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    logger.info(`User ${interaction.user.tag} set up moderation logs to channel #${channel.name}`);
  },

  /**
   * Handles the add subcommand
   * @param {Interaction} interaction - The interaction
   */
  async handleAdd(interaction) {
    await interaction.deferReply();

    const user = interaction.options.getUser('user');
    const action = interaction.options.getString('action');
    const reason = interaction.options.getString('reason');
    const duration = interaction.options.getString('duration');
    const silent = interaction.options.getBoolean('silent') || false;
    const guildId = interaction.guild.id;

    // Initialize or get existing guild settings
    const settings = modlogsDb.read() || {};
    if (!settings[guildId]) {
      return interaction.editReply('⚠️ Moderation logs haven\'t been set up yet. Please use `/modlogs setup` first.');
    }

    // Generate a unique ID for this log
    const logId = generateLogId();

    // Create the log entry
    const logEntry = {
      id: logId,
      userId: user.id,
      userTag: user.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      action,
      reason,
      duration: duration || null,
      timestamp: Date.now()
    };

    // Update stats
    settings[guildId].stats[action + 's']++;

    // Add the log entry
    settings[guildId].logs.push(logEntry);
    modlogsDb.write(settings);

    // Create an embed for the log
    const logEmbed = this.createLogEmbed(logEntry, action);

    // Send to the log channel if set
    if (settings[guildId].logChannel) {
      const logChannel = interaction.guild.channels.cache.get(settings[guildId].logChannel);
      if (logChannel) {
        await logChannel.send({ embeds: [logEmbed] });
      }
    }

    // Send a DM to the user if not silent
    if (!silent) {
      try {
        // Create a simpler embed for the user DM
        const userEmbed = new EmbedBuilder()
          .setTitle(`Moderation Action: ${this.getActionTitle(action)}`)
          .setDescription(`You have received a moderation action in ${interaction.guild.name}.`)
          .addFields(
            { name: 'Reason', value: reason },
            { name: 'Moderator', value: interaction.user.tag }
          )
          .setColor(this.getActionColor(action))
          .setTimestamp();

        if (duration) {
          userEmbed.addFields({ name: 'Duration', value: duration });
        }

        await user.send({ embeds: [userEmbed] });
      } catch (error) {
        logger.warn(`Could not send DM to ${user.tag}: ${error.message}`);
      }
    }

    // Reply to the command
    const replyEmbed = new EmbedBuilder()
      .setTitle('✅ Moderation Log Added')
      .setDescription(`Successfully logged ${this.getActionTitle(action).toLowerCase()} for ${user.tag}`)
      .addFields(
        { name: 'User', value: user.tag, inline: true },
        { name: 'Action', value: this.getActionTitle(action), inline: true },
        { name: 'Log ID', value: logId, inline: true },
        { name: 'Reason', value: reason }
      )
      .setColor(config.successColor)
      .setTimestamp();

    await interaction.editReply({ embeds: [replyEmbed] });
    logger.info(`User ${interaction.user.tag} added a ${action} log for ${user.tag}`);
  },

  /**
   * Handles the view subcommand
   * @param {Interaction} interaction - The interaction
   */
  async handleView(interaction) {
    await interaction.deferReply();

    const user = interaction.options.getUser('user');
    const guildId = interaction.guild.id;

    // Get guild settings
    const settings = modlogsDb.read() || {};
    if (!settings[guildId] || !settings[guildId].logs || settings[guildId].logs.length === 0) {
      return interaction.editReply('No moderation logs found.');
    }

    // Filter logs for the specified user
    const userLogs = settings[guildId].logs.filter(log => log.userId === user.id);

    if (userLogs.length === 0) {
      return interaction.editReply(`No moderation logs found for ${user.tag}.`);
    }

    // Sort logs by timestamp (newest first)
    userLogs.sort((a, b) => b.timestamp - a.timestamp);

    // Create an embed to display logs
    const embed = new EmbedBuilder()
      .setTitle(`Moderation Logs for ${user.tag}`)
      .setColor(config.embedColor)
      .setThumbnail(user.displayAvatarURL())
      .setFooter({ text: `User ID: ${user.id} | Total Logs: ${userLogs.length}` })
      .setTimestamp();

    // Add a field for each log (up to 10 most recent)
    const recentLogs = userLogs.slice(0, 10);
    recentLogs.forEach(log => {
      const actionDate = new Date(log.timestamp);
      const actionTitle = this.getActionTitle(log.action);
      
      embed.addFields({
        name: `${actionTitle} - ${actionDate.toLocaleDateString()}`,
        value: `**ID:** ${log.id}\n**Moderator:** ${log.moderatorTag}\n**Reason:** ${log.reason}${log.duration ? `\n**Duration:** ${log.duration}` : ''}`
      });
    });

    // Add summary of older logs if there are more than 10
    if (userLogs.length > 10) {
      const olderStats = this.calculateStats(userLogs.slice(10));
      const statsText = Object.entries(olderStats)
        .filter(([_, count]) => count > 0)
        .map(([action, count]) => `${count} ${action}`)
        .join(', ');

      embed.addFields({
        name: `${userLogs.length - 10} Older Logs`,
        value: statsText || 'No additional logs'
      });
    }

    await interaction.editReply({ embeds: [embed] });
    logger.info(`User ${interaction.user.tag} viewed moderation logs for ${user.tag}`);
  },

  /**
   * Handles the delete subcommand
   * @param {Interaction} interaction - The interaction
   */
  async handleDelete(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const logId = interaction.options.getString('id');
    const guildId = interaction.guild.id;

    // Get guild settings
    const settings = modlogsDb.read() || {};
    if (!settings[guildId] || !settings[guildId].logs) {
      return interaction.editReply('No moderation logs found.');
    }

    // Find the log entry
    const logIndex = settings[guildId].logs.findIndex(log => log.id === logId);

    if (logIndex === -1) {
      return interaction.editReply(`No log found with ID ${logId}.`);
    }

    // Get the log for later use
    const log = settings[guildId].logs[logIndex];

    // Update stats (decrement)
    if (settings[guildId].stats && settings[guildId].stats[log.action + 's'] > 0) {
      settings[guildId].stats[log.action + 's']--;
    }

    // Remove the log
    settings[guildId].logs.splice(logIndex, 1);
    modlogsDb.write(settings);

    // Create success embed
    const embed = new EmbedBuilder()
      .setTitle('✅ Moderation Log Deleted')
      .setDescription(`Successfully deleted log with ID: ${logId}`)
      .setColor(config.successColor)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    logger.info(`User ${interaction.user.tag} deleted moderation log ${logId}`);
  },

  /**
   * Handles the stats subcommand
   * @param {Interaction} interaction - The interaction
   */
  async handleStats(interaction) {
    await interaction.deferReply();

    const guildId = interaction.guild.id;

    // Get guild settings
    const settings = modlogsDb.read() || {};
    if (!settings[guildId] || !settings[guildId].logs || settings[guildId].logs.length === 0) {
      return interaction.editReply('No moderation logs found to generate statistics.');
    }

    // Get stats
    const stats = settings[guildId].stats || {
      warns: 0,
      mutes: 0,
      kicks: 0,
      bans: 0,
      unbans: 0,
      other: 0
    };

    // Calculate additional statistics
    const totalLogs = settings[guildId].logs.length;
    const uniqueUsers = new Set(settings[guildId].logs.map(log => log.userId)).size;
    const uniqueModerators = new Set(settings[guildId].logs.map(log => log.moderatorId)).size;

    // Create time-based statistics (last 7 days, last 30 days)
    const now = Date.now();
    const last7Days = settings[guildId].logs.filter(log => now - log.timestamp <= 7 * 24 * 60 * 60 * 1000).length;
    const last30Days = settings[guildId].logs.filter(log => now - log.timestamp <= 30 * 24 * 60 * 60 * 1000).length;

    // Find most active moderator
    const moderatorCounts = {};
    settings[guildId].logs.forEach(log => {
      if (!moderatorCounts[log.moderatorId]) {
        moderatorCounts[log.moderatorId] = {
          count: 0,
          tag: log.moderatorTag
        };
      }
      moderatorCounts[log.moderatorId].count++;
    });

    let mostActiveModerator = { tag: 'None', count: 0 };
    Object.values(moderatorCounts).forEach(mod => {
      if (mod.count > mostActiveModerator.count) {
        mostActiveModerator = mod;
      }
    });

    // Create an embed to display stats
    const embed = new EmbedBuilder()
      .setTitle('Moderation Statistics')
      .setColor(config.embedColor)
      .addFields(
        { name: 'Total Logs', value: totalLogs.toString(), inline: true },
        { name: 'Unique Users', value: uniqueUsers.toString(), inline: true },
        { name: 'Unique Moderators', value: uniqueModerators.toString(), inline: true },
        { name: 'Recent Activity', value: `**Last 7 Days:** ${last7Days}\n**Last 30 Days:** ${last30Days}`, inline: false },
        { name: 'Action Breakdown', value: `**Warns:** ${stats.warns}\n**Mutes:** ${stats.mutes}\n**Kicks:** ${stats.kicks}\n**Bans:** ${stats.bans}\n**Unbans:** ${stats.unbans}\n**Other:** ${stats.other}`, inline: true },
        { name: 'Most Active Moderator', value: `${mostActiveModerator.tag} (${mostActiveModerator.count} actions)`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    logger.info(`User ${interaction.user.tag} viewed moderation statistics`);
  },

  /**
   * Creates a log embed for a moderation action
   * @param {Object} log - The log entry
   * @param {string} action - The action type
   * @returns {EmbedBuilder} The created embed
   */
  createLogEmbed(log, action) {
    const actionTitle = this.getActionTitle(action);
    const color = this.getActionColor(action);

    const embed = new EmbedBuilder()
      .setTitle(`Moderation Log: ${actionTitle}`)
      .setColor(color)
      .addFields(
        { name: 'User', value: `${log.userTag} (<@${log.userId}>)`, inline: true },
        { name: 'Moderator', value: `${log.moderatorTag} (<@${log.moderatorId}>)`, inline: true },
        { name: 'Action', value: actionTitle, inline: true },
        { name: 'Reason', value: log.reason }
      )
      .setFooter({ text: `Log ID: ${log.id}` })
      .setTimestamp(log.timestamp);

    if (log.duration) {
      embed.addFields({ name: 'Duration', value: log.duration, inline: true });
    }

    return embed;
  },

  /**
   * Gets the action title based on the action type
   * @param {string} action - The action type
   * @returns {string} The formatted action title
   */
  getActionTitle(action) {
    const titles = {
      warn: 'Warning',
      mute: 'Mute/Timeout',
      kick: 'Kick',
      ban: 'Ban',
      unban: 'Unban',
      other: 'Other Action'
    };

    return titles[action] || 'Unknown Action';
  },

  /**
   * Gets the color for an action
   * @param {string} action - The action type
   * @returns {number} The color
   */
  getActionColor(action) {
    const colors = {
      warn: 0xf39c12, // warning color (yellow/orange)
      mute: 0x3498db, // blue
      kick: 0xe67e22, // orange
      ban: 0xe74c3c, // red
      unban: 0x2ecc71, // green
      other: 0x9b59b6  // purple
    };

    return colors[action] || 0x95a5a6; // default gray
  },

  /**
   * Calculates statistics for an array of logs
   * @param {Array} logs - The array of logs
   * @returns {Object} Statistics object
   */
  calculateStats(logs) {
    const stats = {
      warnings: 0,
      mutes: 0,
      kicks: 0,
      bans: 0,
      unbans: 0,
      other: 0
    };

    logs.forEach(log => {
      switch (log.action) {
        case 'warn': stats.warnings++; break;
        case 'mute': stats.mutes++; break;
        case 'kick': stats.kicks++; break;
        case 'ban': stats.bans++; break;
        case 'unban': stats.unbans++; break;
        default: stats.other++;
      }
    });

    return stats;
  },

  /**
   * Sends an error response
   * @param {Interaction} interaction - The interaction
   * @param {string} message - The error message
   */
  async sendErrorResponse(interaction, message) {
    const embed = new EmbedBuilder()
      .setTitle('❌ Error')
      .setDescription(`An error occurred: ${message}`)
      .setColor(config.errorColor)
      .setTimestamp();

    if (interaction.deferred) {
      await interaction.editReply({ embeds: [embed] }).catch(() => {});
    } else {
      await interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
    }
  }
};

/**
 * Generates a unique ID for a log entry
 * @returns {string} A unique log ID
 */
function generateLogId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
