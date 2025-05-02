const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

// Store active polls: Map<messageId, pollData>
const activePolls = new Map();

// Emoji for poll options
const optionEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll for users to vote on')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('The poll question')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('option1')
        .setDescription('First option')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('option2')
        .setDescription('Second option')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('option3')
        .setDescription('Third option')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('option4')
        .setDescription('Fourth option')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('option5')
        .setDescription('Fifth option')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Duration of the poll in minutes (default: 60)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(1440)),
  
  cooldown: 60,
  
  /**
   * Executes the poll command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Get the poll question and options
      const question = interaction.options.getString('question');
      const options = [];
      
      // Collect all provided options
      for (let i = 1; i <= 5; i++) {
        const option = interaction.options.getString(`option${i}`);
        if (option) options.push(option);
      }
      
      // Get poll duration (default: 60 minutes)
      const duration = interaction.options.getInteger('duration') || 60;
      const endTime = Date.now() + (duration * 60 * 1000);
      
      // Create poll data
      const pollData = {
        question,
        options,
        votes: options.map(() => []), // Array of arrays to store voter IDs for each option
        createdBy: interaction.user.id,
        createdAt: Date.now(),
        endTime,
        duration,
        active: true
      };
      
      // Create the poll embed
      const embed = this.createPollEmbed(pollData, interaction.user);
      
      // Create buttons for voting
      const rows = this.createPollButtons(options);
      
      // Send the poll
      const reply = await interaction.editReply({
        embeds: [embed],
        components: rows,
        fetchReply: true
      });
      
      // Store the poll data with the message ID
      pollData.messageId = reply.id;
      activePolls.set(reply.id, pollData);
      
      // Log the poll creation
      logger.info(`User ${interaction.user.tag} created a poll: "${question}" with ${options.length} options`);
      
      // Set a timeout to end the poll
      setTimeout(() => {
        this.endPoll(reply.id, interaction.channelId, interaction.client);
      }, duration * 60 * 1000);
    } catch (error) {
      logger.error(`Error creating poll: ${error.message}`);
      await interaction.editReply('There was an error creating your poll. Please try again.');
    }
  },
  
  /**
   * Handle button interactions for polls
   * @param {ButtonInteraction} interaction - The button interaction
   */
  async handlePollInteraction(interaction) {
    // Extract the poll ID and option index from the button's custom ID
    // Format: poll_vote:{pollId}:{optionIndex}
    const [pollId, optionIndex] = interaction.customId.split(':').slice(1);
    
    // Get the poll data
    const pollData = activePolls.get(pollId);
    
    // Check if the poll exists and is active
    if (!pollData || !pollData.active) {
      return interaction.reply({
        content: 'This poll has ended or no longer exists.',
        ephemeral: true
      });
    }
    
    // Get the user ID
    const userId = interaction.user.id;
    
    // Check if the user has already voted for this option
    const optionVotes = pollData.votes[optionIndex];
    if (optionVotes.includes(userId)) {
      // Remove the vote
      pollData.votes[optionIndex] = optionVotes.filter(id => id !== userId);
      
      await interaction.reply({
        content: `You removed your vote from "${pollData.options[optionIndex]}"`,
        ephemeral: true
      });
    } else {
      // Check and remove if the user voted for another option
      for (let i = 0; i < pollData.votes.length; i++) {
        if (pollData.votes[i].includes(userId)) {
          pollData.votes[i] = pollData.votes[i].filter(id => id !== userId);
        }
      }
      
      // Add the new vote
      pollData.votes[optionIndex].push(userId);
      
      await interaction.reply({
        content: `You voted for "${pollData.options[optionIndex]}"`,
        ephemeral: true
      });
    }
    
    // Update the poll data
    activePolls.set(pollId, pollData);
    
    // Update the poll embed
    const embed = this.createPollEmbed(pollData, interaction.client.users.cache.get(pollData.createdBy));
    
    // Update the message
    await interaction.message.edit({
      embeds: [embed],
      components: interaction.message.components
    });
    
    // Log the vote
    logger.info(`User ${interaction.user.tag} voted in poll: ${pollData.question.substring(0, 30)}...`);
  },
  
  /**
   * End a poll and display the results
   * @param {string} messageId - The message ID of the poll
   * @param {string} channelId - The channel ID where the poll is
   * @param {Client} client - The Discord client
   */
  async endPoll(messageId, channelId, client) {
    // Get the poll data
    const pollData = activePolls.get(messageId);
    
    // If the poll doesn't exist or is already ended, return
    if (!pollData || !pollData.active) return;
    
    // Mark the poll as inactive
    pollData.active = false;
    activePolls.set(messageId, pollData);
    
    try {
      // Get the channel
      const channel = await client.channels.fetch(channelId);
      if (!channel) return;
      
      // Get the message
      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (!message) return;
      
      // Create the results embed
      const resultsEmbed = this.createResultsEmbed(pollData, client.users.cache.get(pollData.createdBy));
      
      // Update the message with the results
      await message.edit({
        embeds: [resultsEmbed],
        components: [] // Remove buttons
      });
      
      // Announce the results in a new message
      await channel.send({
        content: `📊 The poll "**${pollData.question}**" has ended!`,
        embeds: [resultsEmbed]
      });
      
      // Log the poll end
      logger.info(`Poll ended: ${pollData.question.substring(0, 30)}...`);
    } catch (error) {
      logger.error(`Error ending poll: ${error.message}`);
    }
  },
  
  /**
   * Create the poll embed
   * @param {Object} pollData - The poll data
   * @param {User} author - The poll author
   * @returns {EmbedBuilder} - The poll embed
   */
  createPollEmbed(pollData, author) {
    // Create the embed
    const embed = new EmbedBuilder()
      .setTitle(`📊 Poll: ${pollData.question}`)
      .setColor(config.embedColor || '#3498db')
      .setFooter({ text: `Created by ${author.tag}` })
      .setTimestamp(new Date(pollData.createdAt));
    
    // Calculate total votes
    const totalVotes = pollData.votes.reduce((sum, votes) => sum + votes.length, 0);
    
    // Add fields for each option
    pollData.options.forEach((option, index) => {
      const votes = pollData.votes[index].length;
      const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
      
      // Create a progress bar
      const progressBarLength = 20;
      const filledBlocks = Math.round((percentage / 100) * progressBarLength);
      const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(progressBarLength - filledBlocks);
      
      embed.addFields({
        name: `${optionEmojis[index]} ${option}`,
        value: `${progressBar} ${votes} votes (${percentage}%)`
      });
    });
    
    // Add the total votes and time remaining
    const now = Date.now();
    const timeLeft = pollData.endTime - now;
    
    if (timeLeft > 0 && pollData.active) {
      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);
      
      embed.addFields({
        name: 'Poll Info',
        value: `Total Votes: **${totalVotes}**\nTime Remaining: **${minutes}m ${seconds}s**`
      });
    } else {
      embed.addFields({
        name: 'Poll Info',
        value: `Total Votes: **${totalVotes}**\nStatus: **Ended**`
      });
    }
    
    return embed;
  },
  
  /**
   * Create the results embed
   * @param {Object} pollData - The poll data
   * @param {User} author - The poll author
   * @returns {EmbedBuilder} - The results embed
   */
  createResultsEmbed(pollData, author) {
    // Create the embed
    const embed = new EmbedBuilder()
      .setTitle(`📊 Poll Results: ${pollData.question}`)
      .setColor('#2ecc71') // Green for results
      .setFooter({ text: `Created by ${author.tag}` })
      .setTimestamp(new Date(pollData.createdAt));
    
    // Calculate total votes
    const totalVotes = pollData.votes.reduce((sum, votes) => sum + votes.length, 0);
    
    // Sort options by votes (descending)
    const sortedOptions = pollData.options.map((option, index) => ({
      option,
      votes: pollData.votes[index].length,
      index
    })).sort((a, b) => b.votes - a.votes);
    
    // Add fields for each option
    sortedOptions.forEach((option, rank) => {
      const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
      
      // Create a progress bar
      const progressBarLength = 20;
      const filledBlocks = Math.round((percentage / 100) * progressBarLength);
      const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(progressBarLength - filledBlocks);
      
      // Add crown emoji for the winner if there are votes
      const prefix = rank === 0 && option.votes > 0 ? '👑 ' : '';
      
      embed.addFields({
        name: `${prefix}${rank + 1}. ${optionEmojis[option.index]} ${option.option}`,
        value: `${progressBar} ${option.votes} votes (${percentage}%)`
      });
    });
    
    // Add the total votes and duration
    const pollDuration = pollData.duration;
    embed.addFields({
      name: 'Poll Summary',
      value: `Total Votes: **${totalVotes}**\nDuration: **${pollDuration} minutes**\nStatus: **Ended**`
    });
    
    return embed;
  },
  
  /**
   * Create buttons for poll options
   * @param {Array} options - The poll options
   * @returns {Array} - Array of action rows with buttons
   */
  createPollButtons(options) {
    const rows = [];
    let currentRow = new ActionRowBuilder();
    let buttonCount = 0;
    
    // Create a button for each option (maximum 5 per row, 2 rows max = 10 options max)
    options.forEach((option, index) => {
      // If we've filled a row (5 buttons), create a new row
      if (buttonCount === 5) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder();
        buttonCount = 0;
      }
      
      // Create the button
      const button = new ButtonBuilder()
        .setCustomId(`poll_vote:${index}`)
        .setLabel(`Option ${index + 1}`)
        .setEmoji(optionEmojis[index])
        .setStyle(ButtonStyle.Secondary);
      
      currentRow.addComponents(button);
      buttonCount++;
    });
    
    // Add the last row if it has any buttons
    if (buttonCount > 0) {
      rows.push(currentRow);
    }
    
    return rows;
  }
};