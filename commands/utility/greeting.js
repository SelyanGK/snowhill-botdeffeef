const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const Database = require('../../utils/database');

// Create a database instance for greetings
const greetingsDb = new Database('greetings.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('greeting')
    .setDescription('Configure server welcome messages for new members')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Enable the welcome message system'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable the welcome message system'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('message')
        .setDescription('Set the welcome message text')
        .addStringOption(option =>
          option.setName('text')
            .setDescription('The welcome message text. Use {user} for the member mention')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('add_channel')
        .setDescription('Add a channel to receive welcome messages')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to add')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove_channel')
        .setDescription('Remove a channel from welcome messages')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to remove')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('preview')
        .setDescription('Preview the current welcome message'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('config')
        .setDescription('View or modify greeting configuration')
        .addBooleanOption(option =>
          option.setName('ping')
            .setDescription('Whether to ping the user in welcome messages'))
        .addIntegerOption(option =>
          option.setName('delete_after')
            .setDescription('Number of seconds after which to delete the welcome message (0 to never delete)')
            .setMinValue(0)
            .setMaxValue(300))
        .addBooleanOption(option =>
          option.setName('with_embed')
            .setDescription('Whether to use an embed for the welcome message'))
        .addStringOption(option =>
          option.setName('color')
            .setDescription('The color for the welcome embed (hex code)')
            .setMinLength(4)
            .setMaxLength(7))),

  cooldown: 5,

  /**
   * Execute the greeting command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    try {
      switch (subcommand) {
        case 'enable':
          await this.enableGreeting(interaction);
          break;
        case 'disable':
          await this.disableGreeting(interaction);
          break;
        case 'message':
          await this.setGreetingMessage(interaction);
          break;
        case 'add_channel':
          await this.addChannel(interaction);
          break;
        case 'remove_channel':
          await this.removeChannel(interaction);
          break;
        case 'preview':
          await this.previewGreeting(interaction);
          break;
        case 'config':
          await this.configureGreeting(interaction);
          break;
      }
    } catch (error) {
      logger.error(`Error executing greeting command: ${error.message}`);
      await interaction.reply({
        content: 'An error occurred while managing greeting settings.',
        ephemeral: true
      });
    }
  },

  /**
   * Enable the greeting system
   * @param {Interaction} interaction - The interaction
   */
  async enableGreeting(interaction) {
    // Update the greeting configuration
    const greetingConfig = greetingsDb.read();
    greetingConfig.enabled = true;
    
    // Check if there are any channels
    if (greetingConfig.channels.length === 0) {
      await interaction.reply({
        content: '⚠️ No channels have been added. Please add at least one channel using `/greeting add_channel` first.',
        ephemeral: true
      });
      return;
    }
    
    // Save the updated configuration
    greetingsDb.write(greetingConfig);
    
    // Format channel list for display
    const channelMentions = greetingConfig.channels.map(id => `<#${id}>`).join(', ');
    
    await interaction.reply({
      content: `✅ Welcome messages have been enabled in the following channels: ${channelMentions}`,
      ephemeral: true
    });
    
    logger.info(`User ${interaction.user.tag} enabled welcome messages`);
  },

  /**
   * Disable the greeting system
   * @param {Interaction} interaction - The interaction
   */
  async disableGreeting(interaction) {
    // Update the greeting configuration
    const greetingConfig = greetingsDb.read();
    greetingConfig.enabled = false;
    
    // Save the updated configuration
    greetingsDb.write(greetingConfig);
    
    await interaction.reply({
      content: '✅ Welcome messages have been disabled',
      ephemeral: true
    });
    
    logger.info(`User ${interaction.user.tag} disabled welcome messages`);
  },

  /**
   * Set the greeting message
   * @param {Interaction} interaction - The interaction
   */
  async setGreetingMessage(interaction) {
    const messageText = interaction.options.getString('text');
    
    // Update the greeting configuration
    const greetingConfig = greetingsDb.read();
    greetingConfig.message = messageText;
    
    // Save the updated configuration
    greetingsDb.write(greetingConfig);
    
    await interaction.reply({
      content: '✅ Welcome message has been updated',
      ephemeral: true
    });
    
    logger.info(`User ${interaction.user.tag} updated the welcome message`);
  },

  /**
   * Add a channel to the greeting system
   * @param {Interaction} interaction - The interaction
   */
  async addChannel(interaction) {
    const channel = interaction.options.getChannel('channel');
    
    // Update the greeting configuration
    const greetingConfig = greetingsDb.read();
    
    // Check if the channel is already in the list
    if (greetingConfig.channels.includes(channel.id)) {
      await interaction.reply({
        content: `${channel} is already in the list of greeting channels.`,
        ephemeral: true
      });
      return;
    }
    
    // Add the channel to the list
    greetingConfig.channels.push(channel.id);
    
    // Save the updated configuration
    greetingsDb.write(greetingConfig);
    
    await interaction.reply({
      content: `✅ Added ${channel} to the list of greeting channels.`,
      ephemeral: true
    });
    
    logger.info(`User ${interaction.user.tag} added channel #${channel.name} to greeting channels`);
  },

  /**
   * Remove a channel from the greeting system
   * @param {Interaction} interaction - The interaction
   */
  async removeChannel(interaction) {
    const channel = interaction.options.getChannel('channel');
    
    // Update the greeting configuration
    const greetingConfig = greetingsDb.read();
    
    // Check if the channel is in the list
    if (!greetingConfig.channels.includes(channel.id)) {
      await interaction.reply({
        content: `${channel} is not in the list of greeting channels.`,
        ephemeral: true
      });
      return;
    }
    
    // Remove the channel from the list
    greetingConfig.channels = greetingConfig.channels.filter(id => id !== channel.id);
    
    // Save the updated configuration
    greetingsDb.write(greetingConfig);
    
    await interaction.reply({
      content: `✅ Removed ${channel} from the list of greeting channels.`,
      ephemeral: true
    });
    
    logger.info(`User ${interaction.user.tag} removed channel #${channel.name} from greeting channels`);
  },

  /**
   * Preview the greeting message
   * @param {Interaction} interaction - The interaction
   */
  async previewGreeting(interaction) {
    await interaction.deferReply();
    
    const greetingConfig = greetingsDb.read();
    const previewMessage = greetingConfig.message.replace('{user}', interaction.user.toString());
    
    // Show deletion time if auto-delete is enabled
    let deletionNote = '';
    if (greetingConfig.deleteAfter > 0) {
      deletionNote = `\n\n*This message would be deleted after ${greetingConfig.deleteAfter} seconds.*`;
    }
    
    if (greetingConfig.withEmbed) {
      // Create an embed for the preview
      const embed = new EmbedBuilder()
        .setColor(greetingConfig.color || '#3498db')
        .setDescription(previewMessage + deletionNote)
        .setTimestamp();
      
      await interaction.editReply({
        content: 'Here\'s a preview of your welcome message:',
        embeds: [embed]
      });
    } else {
      await interaction.editReply({
        content: `**Preview:** ${previewMessage}${deletionNote}`
      });
    }
    
    logger.info(`User ${interaction.user.tag} previewed the welcome message`);
  },

  /**
   * Configure greeting settings
   * @param {Interaction} interaction - The interaction
   */
  async configureGreeting(interaction) {
    const ping = interaction.options.getBoolean('ping');
    const deleteAfter = interaction.options.getInteger('delete_after');
    const withEmbed = interaction.options.getBoolean('with_embed');
    const color = interaction.options.getString('color');
    
    // Get current configuration
    const greetingConfig = greetingsDb.read();
    
    // Update configuration based on provided options
    if (ping !== null) greetingConfig.ping = ping;
    if (deleteAfter !== null) greetingConfig.deleteAfter = deleteAfter;
    if (withEmbed !== null) greetingConfig.withEmbed = withEmbed;
    if (color !== null) greetingConfig.color = color;
    
    // Save the updated configuration
    greetingsDb.write(greetingConfig);
    
    // Create an embed to show the current configuration
    const embed = new EmbedBuilder()
      .setTitle('Welcome Message Configuration')
      .setDescription('Current welcome message settings')
      .setColor(greetingConfig.color || '#3498db')
      .addFields(
        { name: 'Status', value: greetingConfig.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: 'Ping User', value: greetingConfig.ping ? '✅ Yes' : '❌ No', inline: true },
        { name: 'Use Embed', value: greetingConfig.withEmbed ? '✅ Yes' : '❌ No', inline: true },
        { name: 'Auto-Delete', value: greetingConfig.deleteAfter > 0 ? `After ${greetingConfig.deleteAfter} seconds` : 'Disabled', inline: true },
        { name: 'Embed Color', value: greetingConfig.color || 'Default', inline: true },
        { name: 'Message', value: greetingConfig.message || 'Default welcome message', inline: false }
      )
      .setFooter({ text: 'Use /greeting preview to see how your message looks' })
      .setTimestamp();
    
    // Add channels list
    if (greetingConfig.channels.length > 0) {
      const channelList = greetingConfig.channels.map(id => `<#${id}>`).join('\n');
      embed.addFields({ name: 'Channels', value: channelList, inline: false });
    } else {
      embed.addFields({ name: 'Channels', value: 'No channels added yet', inline: false });
    }
    
    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
    
    logger.info(`User ${interaction.user.tag} updated greeting configuration`);
  }
};