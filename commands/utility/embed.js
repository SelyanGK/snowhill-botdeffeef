const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { embedColor } = require('../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create and send custom embeds')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create and send a custom embed')
        .addStringOption(option =>
          option.setName('title')
            .setDescription('Title of the embed')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Description/body of the embed')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('color')
            .setDescription('Color of the embed (hex code or common color name)')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('footer')
            .setDescription('Footer text for the embed')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('image')
            .setDescription('Image URL to display in the embed')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('thumbnail')
            .setDescription('Thumbnail URL to display in the embed')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('Create an informational embed')
        .addStringOption(option =>
          option.setName('title')
            .setDescription('Title of the info embed')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Description/body of the info embed')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('warning')
        .setDescription('Create a warning embed')
        .addStringOption(option =>
          option.setName('title')
            .setDescription('Title of the warning embed')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Description/body of the warning embed')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('success')
        .setDescription('Create a success embed')
        .addStringOption(option =>
          option.setName('title')
            .setDescription('Title of the success embed')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Description/body of the success embed')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('error')
        .setDescription('Create an error embed')
        .addStringOption(option =>
          option.setName('title')
            .setDescription('Title of the error embed')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Description/body of the error embed')
            .setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  cooldown: 5,

  /**
   * Executes the embed command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    
    try {
      // Handle different subcommands
      switch (subcommand) {
        case 'create':
          await handleCreateEmbed(interaction, title, description);
          break;
          
        case 'info':
          await handleInfoEmbed(interaction, title, description);
          break;
          
        case 'warning':
          await handleWarningEmbed(interaction, title, description);
          break;
          
        case 'success':
          await handleSuccessEmbed(interaction, title, description);
          break;
          
        case 'error':
          await handleErrorEmbed(interaction, title, description);
          break;
          
        default:
          await interaction.reply({
            content: 'Unknown subcommand. Please use one of the available embed commands.',
            ephemeral: true
          });
      }
      
      logger.info(`User ${interaction.user.tag} created a ${subcommand} embed`);
      
    } catch (error) {
      logger.error(`Error in embed command: ${error}`);
      await interaction.reply({
        content: `An error occurred: ${error.message}`,
        ephemeral: true
      });
    }
  },
};

/**
 * Handles creating a custom embed
 * @param {Interaction} interaction - The interaction
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 */
async function handleCreateEmbed(interaction, title, description) {
  const color = interaction.options.getString('color') || embedColor;
  const footer = interaction.options.getString('footer');
  const imageUrl = interaction.options.getString('image');
  const thumbnailUrl = interaction.options.getString('thumbnail');
  
  // Create embed with the provided options
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
    
  if (footer) {
    embed.setFooter({ text: footer });
  }
  
  if (imageUrl) {
    embed.setImage(imageUrl);
  }
  
  if (thumbnailUrl) {
    embed.setThumbnail(thumbnailUrl);
  }
  
  // Send the embed
  await interaction.reply({ 
    embeds: [embed],
    content: `Embed created by ${interaction.user}`
  });
}

/**
 * Handles creating an info embed
 * @param {Interaction} interaction - The interaction
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 */
async function handleInfoEmbed(interaction, title, description) {
  const embed = new EmbedBuilder()
    .setTitle(`ℹ️ ${title}`)
    .setDescription(description)
    .setColor(embedColor)
    .setFooter({ text: `Information provided by ${interaction.user.tag}` })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

/**
 * Handles creating a warning embed
 * @param {Interaction} interaction - The interaction
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 */
async function handleWarningEmbed(interaction, title, description) {
  const embed = new EmbedBuilder()
    .setTitle(`⚠️ ${title}`)
    .setDescription(description)
    .setColor('#f39c12') // Warning color (yellow/orange)
    .setFooter({ text: `Warning issued by ${interaction.user.tag}` })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

/**
 * Handles creating a success embed
 * @param {Interaction} interaction - The interaction
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 */
async function handleSuccessEmbed(interaction, title, description) {
  const embed = new EmbedBuilder()
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setColor('#2ecc71') // Success color (green)
    .setFooter({ text: `Message from ${interaction.user.tag}` })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

/**
 * Handles creating an error embed
 * @param {Interaction} interaction - The interaction
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 */
async function handleErrorEmbed(interaction, title, description) {
  const embed = new EmbedBuilder()
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setColor('#e74c3c') // Error color (red)
    .setFooter({ text: `Error reported by ${interaction.user.tag}` })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}