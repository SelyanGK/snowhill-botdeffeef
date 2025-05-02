const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quote')
    .setDescription('Quote a message from the server')
    .addStringOption(option =>
      option.setName('message_id')
        .setDescription('The ID of the message to quote')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel where the message is (default: current channel)')
        .setRequired(false)),
  
  cooldown: 5,
  
  /**
   * Executes the quote command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Get command options
      const messageId = interaction.options.getString('message_id');
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      
      // Check if channel is valid for fetching messages
      if (!channel.isTextBased()) {
        return interaction.editReply('The specified channel must be a text channel.');
      }
      
      // Check if the bot has permission to view the channel
      if (!channel.viewable) {
        return interaction.editReply('I don\'t have permission to view messages in that channel.');
      }
      
      // Fetch the message
      const message = await channel.messages.fetch(messageId).catch(() => null);
      
      if (!message) {
        return interaction.editReply('I couldn\'t find that message. Make sure the message ID is correct and that the message is in the specified channel.');
      }
      
      // Create the embed
      const quoteEmbed = new EmbedBuilder()
        .setAuthor({
          name: message.author.tag,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setDescription(message.content)
        .setColor(config.embedColor)
        .setTimestamp(message.createdAt)
        .setFooter({ text: `Quoted by ${interaction.user.tag}` });
        
      // Add a link to the original message
      quoteEmbed.addFields({
        name: 'Source',
        value: `[Jump to message](${message.url})`,
        inline: true
      });
      
      // Add channel if it's not the current channel
      if (channel.id !== interaction.channel.id) {
        quoteEmbed.addFields({
          name: 'Channel',
          value: `${channel}`,
          inline: true
        });
      }
      
      // If the message has attachments, add the first one
      if (message.attachments.size > 0) {
        const attachment = message.attachments.first();
        // Check if it's an image
        if (attachment.contentType?.startsWith('image/')) {
          quoteEmbed.setImage(attachment.url);
        } else {
          // Add as a field if not an image
          quoteEmbed.addFields({
            name: 'Attachment',
            value: `[${attachment.name}](${attachment.url})`,
            inline: true
          });
        }
        
        // Note if there are more attachments
        if (message.attachments.size > 1) {
          quoteEmbed.addFields({
            name: 'Note',
            value: `*This message has ${message.attachments.size} attachments. Use the link to see all of them.*`,
            inline: false
          });
        }
      }
      
      // If the message has embeds, add a note
      if (message.embeds.length > 0) {
        quoteEmbed.addFields({
          name: 'Note',
          value: '*This message contains embeds that cannot be fully quoted. Use the link to see the original.*',
          inline: false
        });
      }
      
      await interaction.editReply({ embeds: [quoteEmbed] });
      logger.info(`User ${interaction.user.tag} quoted message ${messageId} from channel ${channel.name}`);
    } catch (error) {
      logger.error(`Error executing quote command: ${error.message}`);
      await interaction.editReply('An error occurred while quoting the message. Please check that the message ID is valid and try again.');
    }
  }
};
