const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

// Store recently deleted messages (channelId -> message)
const deletedMessages = new Map();

// Maximum number of messages to store per channel
const MAX_STORED_MESSAGES = 5;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('snipe')
    .setDescription('Show recently deleted messages in this channel')
    .addIntegerOption(option =>
      option.setName('index')
        .setDescription('Index of the message to snipe (1 = most recent, 5 = oldest)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(MAX_STORED_MESSAGES))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  cooldown: 5,
  
  /**
   * Executes the snipe command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const channelId = interaction.channelId;
      const index = interaction.options.getInteger('index') || 1;
      
      // Get the channel's deleted messages
      const channelMessages = deletedMessages.get(channelId) || [];
      
      if (channelMessages.length === 0) {
        return interaction.editReply('There are no recently deleted messages in this channel.');
      }
      
      if (index > channelMessages.length) {
        return interaction.editReply(`There ${channelMessages.length === 1 ? 'is' : 'are'} only ${channelMessages.length} deleted message${channelMessages.length === 1 ? '' : 's'} stored for this channel.`);
      }
      
      // Get the requested message
      const deletedMessage = channelMessages[index - 1];
      
      // Create the embed
      const embed = new EmbedBuilder()
        .setAuthor({
          name: deletedMessage.author.tag,
          iconURL: deletedMessage.author.avatarURL({ dynamic: true })
        })
        .setDescription(deletedMessage.content || '*No content*')
        .setColor(config.embedColor)
        .setFooter({ text: `Sniped by ${interaction.user.tag} | ${index}/${channelMessages.length}` })
        .setTimestamp(deletedMessage.createdAt);
      
      // Add image if there was one
      if (deletedMessage.image) {
        embed.setImage(deletedMessage.image);
      }
      
      await interaction.editReply({ embeds: [embed] });
      logger.info(`User ${interaction.user.tag} sniped a deleted message from ${deletedMessage.author.tag} in #${interaction.channel.name}`);
    } catch (error) {
      logger.error(`Error executing snipe command: ${error.message}`);
      await interaction.editReply('An error occurred while retrieving deleted messages.');
    }
  },
  
  /**
   * Handle a message delete event and store the message
   * @param {Message} message - The deleted message
   */
  handleMessageDelete(message) {
    // Ignore DMs, bot messages, and ensure message has necessary properties
    if (!message || !message.guild || !message.author || message.author.bot) return;
    
    // Don't snipe messages from blacklisted channels (e.g., moderation channels)
    const blacklistedChannels = config.snipeBlacklistedChannels || [];
    if (blacklistedChannels.includes(message.channel.id)) return;
    
    // Create a simplified message object to store
    const deletedMessage = {
      content: message.content,
      author: {
        tag: message.author.tag,
        id: message.author.id,
        avatarURL: message.author.displayAvatarURL({ dynamic: true })
      },
      createdAt: message.createdAt,
      image: null
    };
    
    // Check for image attachments
    const attachment = message.attachments.first();
    if (attachment && attachment.contentType && attachment.contentType.startsWith('image/')) {
      deletedMessage.image = attachment.proxyURL || attachment.url;
    }
    
    // Get the channel's existing deleted messages
    const channelId = message.channelId;
    let channelMessages = deletedMessages.get(channelId) || [];
    
    // Add the new message to the beginning of the array
    channelMessages.unshift(deletedMessage);
    
    // Limit the number of stored messages
    if (channelMessages.length > MAX_STORED_MESSAGES) {
      channelMessages = channelMessages.slice(0, MAX_STORED_MESSAGES);
    }
    
    // Update the store
    deletedMessages.set(channelId, channelMessages);
    
    // Clean up old messages periodically
    // Set a timeout to delete this message after 1 hour
    setTimeout(() => {
      const currentMessages = deletedMessages.get(channelId) || [];
      const filteredMessages = currentMessages.filter(msg => msg.createdAt !== deletedMessage.createdAt);
      
      if (filteredMessages.length === 0) {
        deletedMessages.delete(channelId);
      } else {
        deletedMessages.set(channelId, filteredMessages);
      }
    }, 60 * 60 * 1000); // 1 hour
  }
};
