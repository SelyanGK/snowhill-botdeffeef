const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('../../utils/database');
const logger = require('../../utils/logger');
const config = require('../../config.json');
const EmbedCreator = require('../../utils/embedCreator');

// Initialize the automod database
const automodDb = new Database('automod.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure the auto-moderation system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('View current auto-moderation settings')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Toggle a specific auto-moderation feature')
        .addStringOption(option =>
          option.setName('feature')
            .setDescription('The auto-moderation feature to toggle')
            .setRequired(true)
            .addChoices(
              { name: 'Links Detection', value: 'links' },
              { name: 'All Features', value: 'all' }
            )
        )
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Whether to enable or disable the feature')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('punishment')
        .setDescription('Configure auto-moderation punishments')
        .addStringOption(option =>
          option.setName('feature')
            .setDescription('The feature to configure punishment for')
            .setRequired(true)
            .addChoices(
              { name: 'Links Detection', value: 'links' },
              { name: 'All Features', value: 'all' }
            )
        )
        .addStringOption(option =>
          option.setName('action')
            .setDescription('The action to take')
            .setRequired(true)
            .addChoices(
              { name: 'Delete Message Only', value: 'delete' },
              { name: 'Warning', value: 'warn' },
              { name: 'Timeout (5m)', value: 'timeout_5m' },
              { name: 'Timeout (10m)', value: 'timeout_10m' },
              { name: 'Timeout (1h)', value: 'timeout_1h' },
              { name: 'Timeout (1d)', value: 'timeout_1d' },
              { name: 'Kick', value: 'kick' },
              { name: 'Ban', value: 'ban' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('exclude')
        .setDescription('Exclude a channel or role from auto-moderation')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('What to exclude')
            .setRequired(true)
            .addChoices(
              { name: 'Channel', value: 'channel' },
              { name: 'Role', value: 'role' }
            )
        )
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to exclude')
            .setRequired(false)
        )
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to exclude')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('include')
        .setDescription('Remove an exclusion for a channel or role')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('What to include back')
            .setRequired(true)
            .addChoices(
              { name: 'Channel', value: 'channel' },
              { name: 'Role', value: 'role' }
            )
        )
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to include back')
            .setRequired(false)
        )
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to include back')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('whitelist')
        .setDescription('Manage whitelisted links')
        .addStringOption(option =>
          option.setName('action')
            .setDescription('Action to perform')
            .setRequired(true)
            .addChoices(
              { name: 'Add Domain', value: 'add' },
              { name: 'Remove Domain', value: 'remove' },
              { name: 'List All', value: 'list' }
            )
        )
        .addStringOption(option =>
          option.setName('domain')
            .setDescription('Domain to whitelist (e.g. discord.com, youtube.com)')
            .setRequired(false)
        )
    )

    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Reset auto-moderation settings to default')
    ),

  /**
   * Executes the automod command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    // Initialize automod settings if they don't exist
    initAutomodSettings(interaction.guild.id);

    switch (subcommand) {
      case 'status':
        await handleStatus(interaction);
        break;
      case 'toggle':
        await handleToggle(interaction);
        break;
      case 'punishment':
        await handlePunishment(interaction);
        break;
      case 'exclude':
        await handleExclude(interaction);
        break;
      case 'include':
        await handleInclude(interaction);
        break;
      case 'whitelist':
        await handleWhitelist(interaction);
        break;
      case 'reset':
        await handleReset(interaction);
        break;
    }
  },

  /**
   * Checks if a message should be auto-moderated
   * @param {Message} message - The message to check
   * @param {Client} client - The Discord client
   * @returns {Promise<boolean>} - Whether the message was moderated
   */
  async checkMessage(message, client) {
    // Ignore messages from bots
    if (message.author.bot) return false;

    // Get automod settings for this guild
    initAutomodSettings(message.guild.id);
    const settings = automodDb.get(message.guild.id);
    
    // Check if auto-moderation is enabled
    if (!settings.enabled) return false;

    // Check exclusions
    if (isExcluded(message, settings)) return false;

    let wasModerated = false;

    // Check for links only
    if (settings.features.links.enabled) {
      const containsLink = await checkForLinks(message, settings);
      if (containsLink) wasModerated = true;
    }

    return wasModerated;
  },

  /**
   * Initializes auto-moderation settings for a new guild
   * @param {string} guildId - The guild ID to initialize settings for
   */
  initGuildAutomod(guildId) {
    initAutomodSettings(guildId);
  }
};

/**
 * Initializes automod settings for a guild if they don't exist
 * @param {string} guildId - The guild ID
 */
function initAutomodSettings(guildId) {
  const settings = automodDb.get(guildId);
  
  if (!settings) {
    // Create default settings
    const defaultSettings = {
      enabled: true,
      features: {
        links: {
          enabled: true,
          punishment: 'delete'
        },
        spam: {
          enabled: true,
          punishment: 'timeout_5m',
          maxMessages: 5,
          timeWindow: 5 // seconds
        },
        profanity: {
          enabled: true,
          punishment: 'delete'
        }
      },
      exclusions: {
        channels: [],
        roles: []
      },
      whitelistedDomains: [
        'discord.com',
        'discordapp.com',
        'discord.gg',
        'youtube.com',
        'youtu.be',
        'twitch.tv',
        'twitter.com',
        'x.com',
        'instagram.com'
      ],
      profanityList: [
        // Default list of profane words will be populated here
        // This is just a small example list
        "badword1",
        "badword2",
        "badword3"
      ],
      spamTracker: {} // Used to track messages for spam detection
    };
    
    automodDb.set(guildId, defaultSettings);
    return defaultSettings;
  }
  
  return settings;
}

/**
 * Checks if a message should be excluded from moderation
 * @param {Message} message - The message
 * @param {Object} settings - The automod settings
 * @returns {boolean} - Whether the message should be excluded
 */
function isExcluded(message, settings) {
  // Check channel exclusions
  if (settings.exclusions.channels.includes(message.channel.id)) {
    return true;
  }

  // Check role exclusions (if any of the member's roles are excluded)
  const memberRoles = message.member.roles.cache.map(role => role.id);
  for (const role of memberRoles) {
    if (settings.exclusions.roles.includes(role)) {
      return true;
    }
  }

  return false;
}

/**
 * Handles the "status" subcommand
 * @param {Interaction} interaction - The interaction
 */
async function handleStatus(interaction) {
  const settings = automodDb.get(interaction.guild.id);
  
  const embed = EmbedCreator.info(
    '🛡️ Auto-Moderation Status',
    `Current auto-moderation settings for ${interaction.guild.name}`,
    {
      fields: [
        {
          name: 'System Status',
          value: settings.enabled ? '✅ Enabled' : '❌ Disabled',
          inline: true
        },
        {
          name: 'Links Detection',
          value: settings.features.links.enabled ? '✅ Enabled' : '❌ Disabled',
          inline: true
        },
        {
          name: 'Links Punishment',
          value: formatPunishment(settings.features.links.punishment),
          inline: true
        },
        {
          name: 'Whitelisted Domains',
          value: settings.whitelistedDomains.length > 0 
            ? `${settings.whitelistedDomains.length} domains (use \`/automod whitelist list\` to view)`
            : 'None',
          inline: false
        },
        {
          name: 'Excluded Channels',
          value: settings.exclusions.channels.length > 0 
            ? settings.exclusions.channels.map(id => `<#${id}>`).join(', ')
            : 'None',
          inline: false
        },
        {
          name: 'Excluded Roles',
          value: settings.exclusions.roles.length > 0 
            ? settings.exclusions.roles.map(id => `<@&${id}>`).join(', ')
            : 'None',
          inline: false
        }
      ]
    }
  );
  
  await interaction.reply({ embeds: [embed] });
}

/**
 * Formats a punishment value into a readable string
 * @param {string} punishment - The punishment code
 * @returns {string} - Formatted punishment description
 */
function formatPunishment(punishment) {
  switch (punishment) {
    case 'delete': return 'Delete Message';
    case 'warn': return 'Warning';
    case 'timeout_5m': return 'Timeout (5m)';
    case 'timeout_10m': return 'Timeout (10m)';
    case 'timeout_1h': return 'Timeout (1h)';
    case 'timeout_1d': return 'Timeout (1d)';
    case 'kick': return 'Kick';
    case 'ban': return 'Ban';
    default: return 'Unknown';
  }
}

/**
 * Handles the "toggle" subcommand
 * @param {Interaction} interaction - The interaction
 */
async function handleToggle(interaction) {
  const feature = interaction.options.getString('feature');
  const enabled = interaction.options.getBoolean('enabled');
  
  const settings = automodDb.get(interaction.guild.id);
  
  if (feature === 'all') {
    settings.enabled = enabled;
    
    // If enabling all, make sure all features are enabled too
    if (enabled) {
      settings.features.links.enabled = true;
    }
  } else {
    // Make sure global setting is enabled if enabling a feature
    if (enabled && !settings.enabled) {
      settings.enabled = true;
    }
    
    // Update the specific feature
    settings.features[feature].enabled = enabled;
  }
  
  // Save settings
  automodDb.set(interaction.guild.id, settings);
  
  // Reply with confirmation
  if (feature === 'all') {
    await interaction.reply({
      embeds: [
        EmbedCreator.success(
          '🛡️ Auto-Moderation Updated',
          `Auto-moderation system has been ${enabled ? 'enabled' : 'disabled'} for this server.`
        )
      ]
    });
  } else {
    const featureName = {
      'links': 'Links Detection'
    }[feature];
    
    await interaction.reply({
      embeds: [
        EmbedCreator.success(
          '🛡️ Auto-Moderation Updated',
          `${featureName} has been ${enabled ? 'enabled' : 'disabled'}.`
        )
      ]
    });
  }
  
  logger.info(`Auto-moderation ${feature} ${enabled ? 'enabled' : 'disabled'} by ${interaction.user.tag} (${interaction.user.id}) in ${interaction.guild.name}`);
}

/**
 * Handles the "punishment" subcommand
 * @param {Interaction} interaction - The interaction
 */
async function handlePunishment(interaction) {
  const feature = interaction.options.getString('feature');
  const action = interaction.options.getString('action');
  
  const settings = automodDb.get(interaction.guild.id);
  
  if (feature === 'all') {
    // Update all features
    settings.features.links.punishment = action;
  } else {
    // Update specific feature
    settings.features[feature].punishment = action;
  }
  
  // Save settings
  automodDb.set(interaction.guild.id, settings);
  
  // Reply with confirmation
  if (feature === 'all') {
    await interaction.reply({
      embeds: [
        EmbedCreator.success(
          '🛡️ Punishment Updated',
          `All auto-moderation features will now use **${formatPunishment(action)}** as punishment.`
        )
      ]
    });
  } else {
    const featureName = {
      'links': 'Links Detection',
      'spam': 'Spam Detection',
      'profanity': 'Profanity Filter'
    }[feature];
    
    await interaction.reply({
      embeds: [
        EmbedCreator.success(
          '🛡️ Punishment Updated',
          `${featureName} will now use **${formatPunishment(action)}** as punishment.`
        )
      ]
    });
  }
  
  logger.info(`Auto-moderation punishment for ${feature} set to ${action} by ${interaction.user.tag} in ${interaction.guild.name}`);
}

/**
 * Handles the "exclude" subcommand
 * @param {Interaction} interaction - The interaction
 */
async function handleExclude(interaction) {
  const type = interaction.options.getString('type');
  const settings = automodDb.get(interaction.guild.id);
  
  if (type === 'channel') {
    const channel = interaction.options.getChannel('channel');
    
    if (!channel) {
      return interaction.reply({
        embeds: [
          EmbedCreator.error(
            '❌ Error',
            'You must specify a channel to exclude.'
          )
        ],
        ephemeral: true
      });
    }
    
    // Check if channel is already excluded
    if (settings.exclusions.channels.includes(channel.id)) {
      return interaction.reply({
        embeds: [
          EmbedCreator.warning(
            '⚠️ Already Excluded',
            `<#${channel.id}> is already excluded from auto-moderation.`
          )
        ],
        ephemeral: true
      });
    }
    
    // Add channel to exclusions
    settings.exclusions.channels.push(channel.id);
    automodDb.set(interaction.guild.id, settings);
    
    await interaction.reply({
      embeds: [
        EmbedCreator.success(
          '🛡️ Channel Excluded',
          `<#${channel.id}> has been excluded from auto-moderation.`
        )
      ]
    });
    
    logger.info(`Channel ${channel.name} (${channel.id}) excluded from auto-moderation by ${interaction.user.tag} in ${interaction.guild.name}`);
  } else if (type === 'role') {
    const role = interaction.options.getRole('role');
    
    if (!role) {
      return interaction.reply({
        embeds: [
          EmbedCreator.error(
            '❌ Error',
            'You must specify a role to exclude.'
          )
        ],
        ephemeral: true
      });
    }
    
    // Check if role is already excluded
    if (settings.exclusions.roles.includes(role.id)) {
      return interaction.reply({
        embeds: [
          EmbedCreator.warning(
            '⚠️ Already Excluded',
            `<@&${role.id}> is already excluded from auto-moderation.`
          )
        ],
        ephemeral: true
      });
    }
    
    // Add role to exclusions
    settings.exclusions.roles.push(role.id);
    automodDb.set(interaction.guild.id, settings);
    
    await interaction.reply({
      embeds: [
        EmbedCreator.success(
          '🛡️ Role Excluded',
          `<@&${role.id}> has been excluded from auto-moderation.`
        )
      ]
    });
    
    logger.info(`Role ${role.name} (${role.id}) excluded from auto-moderation by ${interaction.user.tag} in ${interaction.guild.name}`);
  }
}

/**
 * Handles the "include" subcommand
 * @param {Interaction} interaction - The interaction
 */
async function handleInclude(interaction) {
  const type = interaction.options.getString('type');
  const settings = automodDb.get(interaction.guild.id);
  
  if (type === 'channel') {
    const channel = interaction.options.getChannel('channel');
    
    if (!channel) {
      return interaction.reply({
        embeds: [
          EmbedCreator.error(
            '❌ Error',
            'You must specify a channel to include back.'
          )
        ],
        ephemeral: true
      });
    }
    
    // Check if channel is not excluded
    if (!settings.exclusions.channels.includes(channel.id)) {
      return interaction.reply({
        embeds: [
          EmbedCreator.warning(
            '⚠️ Not Excluded',
            `<#${channel.id}> is not excluded from auto-moderation.`
          )
        ],
        ephemeral: true
      });
    }
    
    // Remove channel from exclusions
    settings.exclusions.channels = settings.exclusions.channels.filter(id => id !== channel.id);
    automodDb.set(interaction.guild.id, settings);
    
    await interaction.reply({
      embeds: [
        EmbedCreator.success(
          '🛡️ Channel Included',
          `<#${channel.id}> is now included in auto-moderation.`
        )
      ]
    });
    
    logger.info(`Channel ${channel.name} (${channel.id}) re-included in auto-moderation by ${interaction.user.tag} in ${interaction.guild.name}`);
  } else if (type === 'role') {
    const role = interaction.options.getRole('role');
    
    if (!role) {
      return interaction.reply({
        embeds: [
          EmbedCreator.error(
            '❌ Error',
            'You must specify a role to include back.'
          )
        ],
        ephemeral: true
      });
    }
    
    // Check if role is not excluded
    if (!settings.exclusions.roles.includes(role.id)) {
      return interaction.reply({
        embeds: [
          EmbedCreator.warning(
            '⚠️ Not Excluded',
            `<@&${role.id}> is not excluded from auto-moderation.`
          )
        ],
        ephemeral: true
      });
    }
    
    // Remove role from exclusions
    settings.exclusions.roles = settings.exclusions.roles.filter(id => id !== role.id);
    automodDb.set(interaction.guild.id, settings);
    
    await interaction.reply({
      embeds: [
        EmbedCreator.success(
          '🛡️ Role Included',
          `<@&${role.id}> is now included in auto-moderation.`
        )
      ]
    });
    
    logger.info(`Role ${role.name} (${role.id}) re-included in auto-moderation by ${interaction.user.tag} in ${interaction.guild.name}`);
  }
}

/**
 * Handles the "whitelist" subcommand
 * @param {Interaction} interaction - The interaction
 */
async function handleWhitelist(interaction) {
  const action = interaction.options.getString('action');
  const domain = interaction.options.getString('domain');
  const settings = automodDb.get(interaction.guild.id);
  
  if (action === 'list') {
    // List all whitelisted domains
    if (settings.whitelistedDomains.length === 0) {
      return interaction.reply({
        embeds: [
          EmbedCreator.info(
            '🔗 Whitelisted Domains',
            'There are no whitelisted domains. All links will be detected by the auto-moderation system.'
          )
        ]
      });
    }
    
    const domains = settings.whitelistedDomains.map(d => `• ${d}`).join('\n');
    
    await interaction.reply({
      embeds: [
        EmbedCreator.info(
          '🔗 Whitelisted Domains',
          'The following domains are whitelisted and their links will not trigger the auto-moderation:',
          {
            fields: [
              {
                name: 'Domains',
                value: domains
              }
            ]
          }
        )
      ]
    });
  } else if (action === 'add') {
    if (!domain) {
      return interaction.reply({
        embeds: [
          EmbedCreator.error(
            '❌ Error',
            'You must specify a domain to whitelist.'
          )
        ],
        ephemeral: true
      });
    }
    
    // Clean the domain
    const cleanDomain = domain.toLowerCase()
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .split('/')[0];
    
    // Check if domain is already whitelisted
    if (settings.whitelistedDomains.includes(cleanDomain)) {
      return interaction.reply({
        embeds: [
          EmbedCreator.warning(
            '⚠️ Already Whitelisted',
            `\`${cleanDomain}\` is already whitelisted.`
          )
        ],
        ephemeral: true
      });
    }
    
    // Add domain to whitelist
    settings.whitelistedDomains.push(cleanDomain);
    automodDb.set(interaction.guild.id, settings);
    
    await interaction.reply({
      embeds: [
        EmbedCreator.success(
          '🔗 Domain Whitelisted',
          `\`${cleanDomain}\` has been added to the whitelist. Links from this domain will not trigger auto-moderation.`
        )
      ]
    });
    
    logger.info(`Domain ${cleanDomain} whitelisted by ${interaction.user.tag} in ${interaction.guild.name}`);
  } else if (action === 'remove') {
    if (!domain) {
      return interaction.reply({
        embeds: [
          EmbedCreator.error(
            '❌ Error',
            'You must specify a domain to remove from the whitelist.'
          )
        ],
        ephemeral: true
      });
    }
    
    // Clean the domain
    const cleanDomain = domain.toLowerCase()
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .split('/')[0];
    
    // Check if domain is not whitelisted
    if (!settings.whitelistedDomains.includes(cleanDomain)) {
      return interaction.reply({
        embeds: [
          EmbedCreator.warning(
            '⚠️ Not Whitelisted',
            `\`${cleanDomain}\` is not in the whitelist.`
          )
        ],
        ephemeral: true
      });
    }
    
    // Remove domain from whitelist
    settings.whitelistedDomains = settings.whitelistedDomains.filter(d => d !== cleanDomain);
    automodDb.set(interaction.guild.id, settings);
    
    await interaction.reply({
      embeds: [
        EmbedCreator.success(
          '🔗 Domain Removed from Whitelist',
          `\`${cleanDomain}\` has been removed from the whitelist. Links from this domain will now trigger auto-moderation.`
        )
      ]
    });
    
    logger.info(`Domain ${cleanDomain} removed from whitelist by ${interaction.user.tag} in ${interaction.guild.name}`);
  }
}

/**
 * Handles the "profanity" subcommand
 * @param {Interaction} interaction - The interaction
 */
async function handleProfanity(interaction) {
  const action = interaction.options.getString('action');
  const word = interaction.options.getString('word');
  const settings = automodDb.get(interaction.guild.id);
  
  if (action === 'list') {
    // List all profane words
    if (!settings.profanityList || settings.profanityList.length === 0) {
      return interaction.reply({
        embeds: [
          EmbedCreator.info(
            '🔤 Profanity Filter',
            'There are no words in the profanity filter.'
          )
        ],
        ephemeral: true
      });
    }
    
    // Send list in DM to avoid showing these words in public channel
    await interaction.user.send({
      embeds: [
        EmbedCreator.info(
          '🔤 Profanity Filter',
          'The following words are in the profanity filter:',
          {
            fields: [
              {
                name: 'Words',
                value: settings.profanityList.map(w => `• ${w}`).join('\n')
              }
            ]
          }
        )
      ]
    }).catch(() => {
      // If DM fails
      return interaction.reply({
        embeds: [
          EmbedCreator.error(
            '❌ Error',
            'Unable to send you the list in DM. Please make sure your DMs are open.'
          )
        ],
        ephemeral: true
      });
    });
    
    // Confirm in channel
    await interaction.reply({
      embeds: [
        EmbedCreator.success(
          '📩 List Sent',
          'The list of profanity filter words has been sent to your DMs.'
        )
      ],
      ephemeral: true
    });
  } else if (action === 'add') {
    if (!word) {
      return interaction.reply({
        embeds: [
          EmbedCreator.error(
            '❌ Error',
            'You must specify a word to add to the profanity filter.'
          )
        ],
        ephemeral: true
      });
    }
    
    // Clean the word
    const cleanWord = word.toLowerCase().trim();
    
    // Ensure profanityList exists
    if (!settings.profanityList) {
      settings.profanityList = [];
    }
    
    // Check if word is already in the list
    if (settings.profanityList.includes(cleanWord)) {
      return interaction.reply({
        embeds: [
          EmbedCreator.warning(
            '⚠️ Already in Filter',
            `This word is already in the profanity filter.`
          )
        ],
        ephemeral: true
      });
    }
    
    // Add word to profanity list
    settings.profanityList.push(cleanWord);
    automodDb.set(interaction.guild.id, settings);
    
    await interaction.reply({
      embeds: [
        EmbedCreator.success(
          '🔤 Word Added to Filter',
          `The word has been added to the profanity filter.`
        )
      ],
      ephemeral: true
    });
    
    logger.info(`Word added to profanity filter by ${interaction.user.tag} in ${interaction.guild.name}`);
  } else if (action === 'remove') {
    if (!word) {
      return interaction.reply({
        embeds: [
          EmbedCreator.error(
            '❌ Error',
            'You must specify a word to remove from the profanity filter.'
          )
        ],
        ephemeral: true
      });
    }
    
    // Clean the word
    const cleanWord = word.toLowerCase().trim();
    
    // Ensure profanityList exists
    if (!settings.profanityList) {
      settings.profanityList = [];
    }
    
    // Check if word is not in the list
    if (!settings.profanityList.includes(cleanWord)) {
      return interaction.reply({
        embeds: [
          EmbedCreator.warning(
            '⚠️ Not in Filter',
            `This word is not in the profanity filter.`
          )
        ],
        ephemeral: true
      });
    }
    
    // Remove word from profanity list
    settings.profanityList = settings.profanityList.filter(w => w !== cleanWord);
    automodDb.set(interaction.guild.id, settings);
    
    await interaction.reply({
      embeds: [
        EmbedCreator.success(
          '🔤 Word Removed from Filter',
          `The word has been removed from the profanity filter.`
        )
      ],
      ephemeral: true
    });
    
    logger.info(`Word removed from profanity filter by ${interaction.user.tag} in ${interaction.guild.name}`);
  }
}

/**
 * Handles the "cooldown" subcommand
 * @param {Interaction} interaction - The interaction
 */
async function handleCooldown(interaction) {
  const messages = interaction.options.getInteger('messages');
  const seconds = interaction.options.getInteger('seconds');
  
  const settings = automodDb.get(interaction.guild.id);
  
  // Update spam settings
  settings.features.spam.maxMessages = messages;
  settings.features.spam.timeWindow = seconds;
  
  // Save settings
  automodDb.set(interaction.guild.id, settings);
  
  await interaction.reply({
    embeds: [
      EmbedCreator.success(
        '⏱️ Spam Detection Settings Updated',
        `Spam detection will now trigger when a user sends ${messages} or more messages within ${seconds} seconds.`
      )
    ]
  });
  
  logger.info(`Spam detection settings updated to ${messages} messages in ${seconds}s by ${interaction.user.tag} in ${interaction.guild.name}`);
}

/**
 * Handles the "reset" subcommand
 * @param {Interaction} interaction - The interaction
 */
async function handleReset(interaction) {
  // Just delete current settings, they'll be recreated with defaults
  automodDb.delete(interaction.guild.id);
  
  // Initialize with defaults
  initAutomodSettings(interaction.guild.id);
  
  await interaction.reply({
    embeds: [
      EmbedCreator.success(
        '🔄 Auto-Moderation Reset',
        'Auto-moderation settings have been reset to default values.'
      )
    ]
  });
  
  logger.info(`Auto-moderation settings reset to defaults by ${interaction.user.tag} in ${interaction.guild.name}`);
}

/**
 * Checks a message for links
 * @param {Message} message - The message to check
 * @param {Object} settings - Auto-moderation settings
 * @returns {Promise<boolean>} - Whether the message contained links and was moderated
 */
async function checkForLinks(message, settings) {
  // Regular expression to detect links
  const linkRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = message.content.match(linkRegex);
  
  if (!matches) return false;
  
  // Check each link against the whitelist
  for (const link of matches) {
    // Extract the domain
    let domain;
    try {
      const url = new URL(link);
      domain = url.hostname.replace(/^www\./, '');
    } catch (e) {
      // If it's not a valid URL, try to extract the domain manually
      domain = link.replace(/(https?:\/\/)?(www\.)?/, '').split('/')[0];
    }
    
    // Check if the domain is whitelisted
    const isWhitelisted = settings.whitelistedDomains.some(d => 
      domain.endsWith(d) || d.endsWith(domain)
    );
    
    if (!isWhitelisted) {
      // Link is not whitelisted, apply punishment
      await applyPunishment(message, settings.features.links.punishment, 'posting a non-whitelisted link');
      return true;
    }
  }
  
  return false;
}

/**
 * Checks a message for spam
 * @param {Message} message - The message to check
 * @param {Object} settings - Auto-moderation settings
 * @returns {Promise<boolean>} - Whether the message was spam and was moderated
 */
async function checkForSpam(message, settings) {
  const userId = message.author.id;
  const now = Date.now();
  
  // Initialize spamTracker for this guild if it doesn't exist
  if (!settings.spamTracker) {
    settings.spamTracker = {};
  }
  
  // Initialize user's message history if it doesn't exist
  if (!settings.spamTracker[userId]) {
    settings.spamTracker[userId] = [];
  }
  
  // Add current message timestamp
  settings.spamTracker[userId].push(now);
  
  // Remove messages older than the time window
  const timeWindowMs = settings.features.spam.timeWindow * 1000;
  settings.spamTracker[userId] = settings.spamTracker[userId].filter(
    timestamp => now - timestamp < timeWindowMs
  );
  
  // Save updated spam tracker
  automodDb.set(message.guild.id, settings);
  
  // Check if user exceeded the max messages in the time window
  if (settings.spamTracker[userId].length >= settings.features.spam.maxMessages) {
    // User is spamming, apply punishment
    await applyPunishment(message, settings.features.spam.punishment, 'spamming messages');
    
    // Clear their spam history after punishment
    settings.spamTracker[userId] = [];
    automodDb.set(message.guild.id, settings);
    
    return true;
  }
  
  return false;
}

/**
 * Checks a message for profanity
 * @param {Message} message - The message to check
 * @param {Object} settings - Auto-moderation settings
 * @returns {Promise<boolean>} - Whether the message contained profanity and was moderated
 */
async function checkForProfanity(message, settings) {
  // Ensure profanityList exists
  if (!settings.profanityList) {
    settings.profanityList = [];
  }
  
  // Check content against profanity list
  const content = message.content.toLowerCase();
  for (const word of settings.profanityList) {
    // Match whole words only
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(content)) {
      // Profanity detected, apply punishment
      await applyPunishment(message, settings.features.profanity.punishment, 'using prohibited language');
      return true;
    }
  }
  
  return false;
}

/**
 * Applies a punishment to a user
 * @param {Message} message - The offending message
 * @param {string} punishment - The punishment to apply
 * @param {string} reason - The reason for the punishment
 * @returns {Promise<void>}
 */
async function applyPunishment(message, punishment, reason) {
  // Always delete the message
  try {
    await message.delete();
    logger.info(`Deleted message from ${message.author.tag} (${message.author.id}) in #${message.channel.name}: ${reason}`);
  } catch (error) {
    logger.error(`Failed to delete message: ${error.message}`);
    return; // If we can't delete the message, don't proceed with punishment
  }
  
  // If punishment is just deletion, we're done
  if (punishment === 'delete') return;
  
  // Apply additional punishment based on type
  try {
    switch (punishment) {
      case 'warn':
        // Send warning message to channel
        const warnMsg = await message.channel.send({
          content: `⚠️ <@${message.author.id}>, please refrain from ${reason}. This is a warning.`
        });
        
        // Delete warning after 20 seconds
        setTimeout(() => {
          warnMsg.delete().catch(e => logger.error(`Failed to delete warning message: ${e.message}`));
        }, 20000);
        
        logger.info(`Warned ${message.author.tag} (${message.author.id}) for ${reason}`);
        break;
        
      case 'timeout_5m':
        await message.member.timeout(5 * 60 * 1000, `Auto-moderation: ${reason}`);
        const timeoutMsg = await message.channel.send({
          content: `🔇 <@${message.author.id}>, you have been timed out for 5 minutes for ${reason}.`
        });
        
        // Delete timeout message after 20 seconds
        setTimeout(() => {
          timeoutMsg.delete().catch(e => logger.error(`Failed to delete timeout message: ${e.message}`));
        }, 20000);
        
        logger.info(`Timed out ${message.author.tag} (${message.author.id}) for 5 minutes for ${reason}`);
        break;
        
      case 'timeout_10m':
        await message.member.timeout(10 * 60 * 1000, `Auto-moderation: ${reason}`);
        const timeout10Msg = await message.channel.send({
          content: `🔇 <@${message.author.id}>, you have been timed out for 10 minutes for ${reason}.`
        });
        
        // Delete timeout message after 20 seconds
        setTimeout(() => {
          timeout10Msg.delete().catch(e => logger.error(`Failed to delete timeout message: ${e.message}`));
        }, 20000);
        
        logger.info(`Timed out ${message.author.tag} (${message.author.id}) for 10 minutes for ${reason}`);
        break;
        
      case 'timeout_1h':
        await message.member.timeout(60 * 60 * 1000, `Auto-moderation: ${reason}`);
        const timeout1hMsg = await message.channel.send({
          content: `🔇 <@${message.author.id}>, you have been timed out for 1 hour for ${reason}.`
        });
        
        // Delete timeout message after 20 seconds
        setTimeout(() => {
          timeout1hMsg.delete().catch(e => logger.error(`Failed to delete timeout message: ${e.message}`));
        }, 20000);
        
        logger.info(`Timed out ${message.author.tag} (${message.author.id}) for 1 hour for ${reason}`);
        break;
        
      case 'timeout_1d':
        await message.member.timeout(24 * 60 * 60 * 1000, `Auto-moderation: ${reason}`);
        const timeout1dMsg = await message.channel.send({
          content: `🔇 <@${message.author.id}>, you have been timed out for 1 day for ${reason}.`
        });
        
        // Delete timeout message after 20 seconds
        setTimeout(() => {
          timeout1dMsg.delete().catch(e => logger.error(`Failed to delete timeout message: ${e.message}`));
        }, 20000);
        
        logger.info(`Timed out ${message.author.tag} (${message.author.id}) for 1 day for ${reason}`);
        break;
        
      case 'kick':
        const kickUser = message.author;
        await message.member.kick(`Auto-moderation: ${reason}`);
        const kickMsg = await message.channel.send({
          content: `👢 **${kickUser.tag}** has been kicked for ${reason}.`
        });
        
        // Delete kick message after 20 seconds
        setTimeout(() => {
          kickMsg.delete().catch(e => logger.error(`Failed to delete kick message: ${e.message}`));
        }, 20000);
        
        logger.info(`Kicked ${kickUser.tag} (${kickUser.id}) for ${reason}`);
        break;
        
      case 'ban':
        const banUser = message.author;
        await message.member.ban({ reason: `Auto-moderation: ${reason}` });
        const banMsg = await message.channel.send({
          content: `🔨 **${banUser.tag}** has been banned for ${reason}.`
        });
        
        // Delete ban message after 20 seconds
        setTimeout(() => {
          banMsg.delete().catch(e => logger.error(`Failed to delete ban message: ${e.message}`));
        }, 20000);
        
        logger.info(`Banned ${banUser.tag} (${banUser.id}) for ${reason}`);
        break;
    }
  } catch (error) {
    logger.error(`Failed to apply punishment (${punishment}): ${error.message}`);
  }
}