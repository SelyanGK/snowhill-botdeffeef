const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');
const Database = require('../../utils/database');

// Autoreply database
const autoreplyDb = new Database('autoreply.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autoreply')
    .setDescription('Set up automatic responses to message triggers')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a new auto-reply')
        .addStringOption(option =>
          option.setName('trigger')
            .setDescription('The text that triggers the response')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('response')
            .setDescription('The response to send when triggered')
            .setRequired(true))
        .addBooleanOption(option =>
          option.setName('exact_match')
            .setDescription('Whether trigger must match exactly (default: false)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove an auto-reply')
        .addStringOption(option =>
          option.setName('trigger')
            .setDescription('The trigger text to remove')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all auto-replies'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  cooldown: 5,
  
  /**
   * Executes the autoreply command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const subcommand = interaction.options.getSubcommand();
      const guildId = interaction.guild.id;
      
      // Initialize autoreply data for this guild if it doesn't exist
      this.initializeGuildData(guildId);
      
      if (subcommand === 'add') {
        await this.addAutoreply(interaction);
      } else if (subcommand === 'remove') {
        await this.removeAutoreply(interaction);
      } else if (subcommand === 'list') {
        await this.listAutoreplies(interaction);
      }
    } catch (error) {
      logger.error(`Error executing autoreply command: ${error.message}`);
      await interaction.editReply('An error occurred while managing auto-replies.');
    }
  },
  
  /**
   * Add a new auto-reply
   * @param {Interaction} interaction - The interaction
   */
  async addAutoreply(interaction) {
    const trigger = interaction.options.getString('trigger');
    const response = interaction.options.getString('response');
    const exactMatch = interaction.options.getBoolean('exact_match') || false;
    const guildId = interaction.guild.id;
    
    // Ensure the trigger and response aren't too long
    if (trigger.length > 100) {
      return interaction.editReply('Trigger text must be 100 characters or less.');
    }
    
    if (response.length > 2000) {
      return interaction.editReply('Response text must be 2000 characters or less.');
    }
    
    // Update the autoreply settings
    const autoreplyData = autoreplyDb.read();
    
    // Check if this trigger already exists
    const existingTrigger = autoreplyData[guildId].triggers.find(t => t.text.toLowerCase() === trigger.toLowerCase());
    if (existingTrigger) {
      return interaction.editReply(`There is already an auto-reply for that trigger. Remove it first if you want to change it.`);
    }
    
    // Add the new trigger
    autoreplyData[guildId].triggers.push({
      text: trigger,
      response: response,
      exactMatch: exactMatch,
      createdBy: interaction.user.id,
      createdAt: Date.now()
    });
    
    autoreplyDb.write(autoreplyData);
    
    // Send success message
    const embed = new EmbedBuilder()
      .setTitle('Auto-Reply Added')
      .setDescription(`A new auto-reply has been added successfully!`)
      .addFields(
        { name: 'Trigger', value: `\`${trigger}\``, inline: false },
        { name: 'Response', value: response.length > 1024 ? response.substring(0, 1021) + '...' : response, inline: false },
        { name: 'Match Type', value: exactMatch ? 'Exact match only' : 'Partial match', inline: true }
      )
      .setColor(config.embedColor)
      .setFooter({ text: `Added by ${interaction.user.tag}` })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    logger.info(`User ${interaction.user.tag} added auto-reply for trigger '${trigger}' in guild ${interaction.guild.name}`);
  },
  
  /**
   * Remove an auto-reply
   * @param {Interaction} interaction - The interaction
   */
  async removeAutoreply(interaction) {
    const trigger = interaction.options.getString('trigger');
    const guildId = interaction.guild.id;
    
    // Update the autoreply settings
    const autoreplyData = autoreplyDb.read();
    
    // Find the trigger (case insensitive)
    const triggerIndex = autoreplyData[guildId].triggers.findIndex(
      t => t.text.toLowerCase() === trigger.toLowerCase()
    );
    
    if (triggerIndex === -1) {
      return interaction.editReply(`No auto-reply found for trigger: \`${trigger}\``);
    }
    
    // Store the trigger before removing it
    const removedTrigger = autoreplyData[guildId].triggers[triggerIndex];
    
    // Remove the trigger
    autoreplyData[guildId].triggers.splice(triggerIndex, 1);
    autoreplyDb.write(autoreplyData);
    
    // Send success message
    const embed = new EmbedBuilder()
      .setTitle('Auto-Reply Removed')
      .setDescription(`The auto-reply for trigger \`${trigger}\` has been removed.`)
      .setColor(config.embedColor)
      .setFooter({ text: `Removed by ${interaction.user.tag}` })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    logger.info(`User ${interaction.user.tag} removed auto-reply for trigger '${trigger}' in guild ${interaction.guild.name}`);
  },
  
  /**
   * List all auto-replies
   * @param {Interaction} interaction - The interaction
   */
  async listAutoreplies(interaction) {
    const guildId = interaction.guild.id;
    const autoreplyData = autoreplyDb.read();
    
    const triggers = autoreplyData[guildId].triggers;
    
    if (triggers.length === 0) {
      return interaction.editReply('There are no auto-replies configured for this server.');
    }
    
    // Format the auto-replies list
    const formattedTriggers = triggers.map((t, index) => {
      const responsePreview = t.response.length > 50 
        ? t.response.substring(0, 47) + '...' 
        : t.response;
      
      return `**${index + 1}.** \`${t.text}\` (${t.exactMatch ? 'Exact' : 'Partial'})\n→ ${responsePreview}`;
    });
    
    // Split into multiple embeds if the list is too long
    const embedsContent = [];
    let currentContent = '';
    
    formattedTriggers.forEach(item => {
      // If adding this item would exceed Discord's embed limit, start a new embed
      if (currentContent.length + item.length > 4000) {
        embedsContent.push(currentContent);
        currentContent = item;
      } else {
        currentContent += (currentContent ? '\n\n' : '') + item;
      }
    });
    
    // Add the last content chunk (if any)
    if (currentContent) {
      embedsContent.push(currentContent);
    }
    
    // Create the embeds
    const embeds = embedsContent.map((content, index) => {
      return new EmbedBuilder()
        .setTitle(`Auto-Replies (${triggers.length})${embedsContent.length > 1 ? ` - Page ${index + 1}/${embedsContent.length}` : ''}`)
        .setDescription(content)
        .setColor(config.embedColor)
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp();
    });
    
    // Send the first embed
    if (embeds.length === 1) {
      await interaction.editReply({ embeds: [embeds[0]] });
    } else {
      // Send multiple embeds (up to 10, which is Discord's limit)
      const maxEmbeds = Math.min(embeds.length, 10);
      await interaction.editReply({ 
        content: `Found ${triggers.length} auto-replies (showing in ${maxEmbeds} pages):`, 
        embeds: embeds.slice(0, maxEmbeds) 
      });
    }
    
    logger.info(`User ${interaction.user.tag} listed ${triggers.length} auto-replies in guild ${interaction.guild.name}`);
  },
  
  /**
   * Initialize guild data in the database if it doesn't exist
   * @param {string} guildId - The guild ID
   */
  initializeGuildData(guildId) {
    const autoreplyData = autoreplyDb.read() || {};
    
    if (!autoreplyData[guildId]) {
      autoreplyData[guildId] = {
        triggers: []
      };
      autoreplyDb.write(autoreplyData);
    }
  },
  
  /**
   * Check a message against auto-replies and respond if triggered
   * @param {Message} message - The message to check
   */
  async checkMessage(message) {
    try {
      // Ignore messages from bots or DMs
      if (message.author.bot || !message.guild) return;
      
      const guildId = message.guild.id;
      
      // Get auto-reply data for this guild
      const autoreplyData = autoreplyDb.read() || {};
      if (!autoreplyData[guildId] || !autoreplyData[guildId].triggers || autoreplyData[guildId].triggers.length === 0) {
        return;
      }
      
      const content = message.content.toLowerCase();
      
      // Check each trigger
      for (const trigger of autoreplyData[guildId].triggers) {
        const triggerText = trigger.text.toLowerCase();
        const exactMatch = trigger.exactMatch;
        
        // Determine if the message matches the trigger
        const isMatch = exactMatch 
          ? content === triggerText 
          : content.includes(triggerText);
        
        if (isMatch) {
          // Trigger a typing indicator to simulate thinking
          await message.channel.sendTyping().catch(() => {});
          
          // Add a slight delay to make it feel more natural (300-1000ms)
          const delay = 300 + Math.floor(Math.random() * 700);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Send the auto-reply
          await message.reply({
            content: trigger.response,
            allowedMentions: { 
              repliedUser: true,
              users: [], // Don't ping any users mentioned in the response
              roles: [] // Don't ping any roles mentioned in the response
            }
          });
          
          logger.info(`Auto-reply triggered by '${trigger.text}' in guild ${message.guild.name}`);
          
          // Stop after the first match to avoid multiple responses
          break;
        }
      }
    } catch (error) {
      logger.error(`Error checking message for auto-replies: ${error.message}`);
    }
  }
};
