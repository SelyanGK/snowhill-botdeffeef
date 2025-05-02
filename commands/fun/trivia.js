const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

// Store active trivia games
const activeGames = new Map();

// Trivia categories and questions
const triviaData = {
  programming: [
    {
      question: "What programming language was created by Brendan Eich in 10 days in 1995?",
      options: ["JavaScript", "Python", "Java", "PHP"],
      answer: 0,
      explanation: "JavaScript was created by Brendan Eich in May 1995 while he was working at Netscape Communications Corporation."
    },
    {
      question: "What does 'DOM' stand for in web development?",
      options: ["Document Object Model", "Data Object Model", "Document Oriented Module", "Digital Object Memory"],
      answer: 0,
      explanation: "The Document Object Model (DOM) is a programming interface for web documents."
    },
    {
      question: "Which data structure uses LIFO (Last In, First Out)?",
      options: ["Stack", "Queue", "Tree", "Hash Table"],
      answer: 0,
      explanation: "A Stack follows the Last In, First Out (LIFO) principle where the last element added is the first one to be removed."
    },
    {
      question: "What year was Python first released?",
      options: ["1991", "1995", "1989", "2000"],
      answer: 0,
      explanation: "Python was first released in 1991 by its creator Guido van Rossum."
    },
    {
      question: "What does SQL stand for?",
      options: ["Structured Query Language", "Simple Query Language", "Sequential Question Language", "Systematic Quality Language"],
      answer: 0,
      explanation: "SQL stands for Structured Query Language, which is used to communicate with and manipulate databases."
    }
  ],
  science: [
    {
      question: "What is the most abundant element in the Earth's atmosphere?",
      options: ["Nitrogen", "Oxygen", "Carbon dioxide", "Hydrogen"],
      answer: 0,
      explanation: "Nitrogen makes up approximately 78% of the Earth's atmosphere."
    },
    {
      question: "What is the hardest natural substance on Earth?",
      options: ["Diamond", "Titanium", "Platinum", "Quartz"],
      answer: 0,
      explanation: "Diamond is the hardest known natural material on Earth, scoring 10 on the Mohs scale of mineral hardness."
    },
    {
      question: "What is the speed of light in a vacuum?",
      options: ["299,792,458 meters per second", "300,000,000 meters per second", "150,000,000 meters per second", "200,000,000 meters per second"],
      answer: 0,
      explanation: "The speed of light in a vacuum is exactly 299,792,458 meters per second."
    },
    {
      question: "What is the chemical symbol for gold?",
      options: ["Au", "Ag", "Fe", "Go"],
      answer: 0,
      explanation: "The chemical symbol for gold is Au, from the Latin word 'aurum'."
    },
    {
      question: "Which planet has the most moons?",
      options: ["Saturn", "Jupiter", "Uranus", "Neptune"],
      answer: 0,
      explanation: "Saturn has the most confirmed moons with 83 confirmed as of 2023, surpassing Jupiter's 79 confirmed moons."
    }
  ],
  gaming: [
    {
      question: "What year was the first Super Mario Bros. game released?",
      options: ["1985", "1980", "1990", "1995"],
      answer: 0,
      explanation: "The first Super Mario Bros. game was released for the Nintendo Entertainment System (NES) in 1985."
    },
    {
      question: "Which company created Minecraft?",
      options: ["Mojang", "Blizzard", "Epic Games", "EA"],
      answer: 0,
      explanation: "Minecraft was created by Markus 'Notch' Persson and later developed by Mojang Studios, which was acquired by Microsoft in 2014."
    },
    {
      question: "What is the best-selling video game of all time?",
      options: ["Minecraft", "Tetris", "Grand Theft Auto V", "Wii Sports"],
      answer: 0,
      explanation: "Minecraft is the best-selling video game of all time, with over 238 million copies sold across all platforms as of 2023."
    },
    {
      question: "Which character is NOT from the Street Fighter series?",
      options: ["Link", "Ryu", "Chun-Li", "Ken"],
      answer: 0,
      explanation: "Link is a character from The Legend of Zelda series, while Ryu, Chun-Li, and Ken are all characters from the Street Fighter series."
    },
    {
      question: "What does NPC stand for in gaming?",
      options: ["Non-Player Character", "New Player Content", "Next Playable Character", "No Point Collecting"],
      answer: 0,
      explanation: "NPC stands for Non-Player Character, which refers to any character in a game that is not controlled by a player."
    }
  ],
  history: [
    {
      question: "In what year did World War II end?",
      options: ["1945", "1944", "1946", "1950"],
      answer: 0,
      explanation: "World War II ended in 1945 with the surrender of Germany in May and Japan in September."
    },
    {
      question: "Who was the first Emperor of Rome?",
      options: ["Augustus", "Julius Caesar", "Nero", "Constantine"],
      answer: 0,
      explanation: "Augustus (originally Octavian) was the first Emperor of Rome, ruling from 27 BCE to 14 CE."
    },
    {
      question: "The Great Wall of China was built to defend against which people?",
      options: ["Mongols", "Japanese", "Russians", "Vietnamese"],
      answer: 0,
      explanation: "The Great Wall of China was primarily built to protect against invasions from various northern nomadic groups, including the Mongols."
    },
    {
      question: "Who was the first woman to win a Nobel Prize?",
      options: ["Marie Curie", "Rosalind Franklin", "Ada Lovelace", "Dorothy Hodgkin"],
      answer: 0,
      explanation: "Marie Curie was the first woman to win a Nobel Prize in 1903 for Physics, and later won another for Chemistry in 1911."
    },
    {
      question: "Which famous speech by Martin Luther King Jr. contained the line 'I have a dream'?",
      options: ["I Have a Dream", "Letter from Birmingham Jail", "Beyond Vietnam", "The Ballot or the Bullet"],
      answer: 0,
      explanation: "The 'I Have a Dream' speech was delivered by Martin Luther King Jr. on August 28, 1963, during the March on Washington for Jobs and Freedom."
    }
  ]
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Play a trivia game')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Choose a trivia category')
        .setRequired(true)
        .addChoices(
          { name: 'Programming', value: 'programming' },
          { name: 'Science', value: 'science' },
          { name: 'Gaming', value: 'gaming' },
          { name: 'History', value: 'history' }
        )),
  
  cooldown: 5,
  
  /**
   * Executes the trivia command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });
    
    try {
      // Check if there's already a trivia game in this channel
      if (activeGames.has(interaction.channelId)) {
        return interaction.editReply("There's already a trivia game in progress in this channel!");
      }
      
      // Get the selected category
      const category = interaction.options.getString('category');
      
      // Ensure the category exists
      if (!triviaData[category]) {
        return interaction.editReply('Invalid category selected.');
      }
      
      // Select a random question from the category
      const questions = triviaData[category];
      const questionIndex = Math.floor(Math.random() * questions.length);
      const question = questions[questionIndex];
      
      // Create a unique game ID
      const gameId = `${interaction.channelId}-${Date.now()}`;
      
      // Store the game data
      activeGames.set(interaction.channelId, {
        id: gameId,
        hostId: interaction.user.id,
        question,
        category,
        startTime: Date.now(),
        participants: new Map(), // userId -> answer index
        messageId: null // Will be set after the message is sent
      });
      
      // Create option buttons
      const actionRow = new ActionRowBuilder();
      for (let i = 0; i < question.options.length; i++) {
        actionRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`trivia:${gameId}:answer:${i}`)
            .setLabel(question.options[i])
            .setStyle(ButtonStyle.Primary)
        );
      }
      
      // Add a cancel button for the host only
      const cancelRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`trivia:${gameId}:cancel`)
          .setLabel('End Game')
          .setStyle(ButtonStyle.Danger)
      );
      
      // Format the trivia embed
      const embed = new EmbedBuilder()
        .setTitle(`Trivia: ${category.charAt(0).toUpperCase() + category.slice(1)}`)
        .setDescription(`**Question:**\n${question.question}`)
        .setColor(config.embedColor)
        .setFooter({ text: `Hosted by ${interaction.user.tag} • Game ID: ${gameId.split('-')[1]}` })
        .setTimestamp();
      
      // Send the trivia question
      const reply = await interaction.editReply({
        embeds: [embed],
        components: [actionRow, cancelRow]
      });
      
      // Store the message ID for later reference
      const game = activeGames.get(interaction.channelId);
      if (game) {
        game.messageId = reply.id;
      }
      
      // Set up automatic game end after 60 seconds
      setTimeout(() => {
        this.endTriviaGame(interaction.client, interaction.channelId, true);
      }, 60000);
      
      logger.info(`User ${interaction.user.tag} started a ${category} trivia game in channel ${interaction.channelId}`);
    } catch (error) {
      logger.error(`Error executing trivia command: ${error.message}`);
      await interaction.editReply('An error occurred while setting up the trivia game.');
    }
  },
  
  /**
   * Handles button interactions for the trivia game
   * @param {ButtonInteraction} interaction - The button interaction
   * @param {string} gameId - The game ID
   * @param {string} action - The button action (answer or cancel)
   * @param {string} answerId - The answer ID (if action is 'answer')
   */
  async handleTriviaInteraction(interaction, gameId, action, answerId) {
    // Get the game data
    const game = activeGames.get(interaction.channelId);
    
    // Check if the game exists
    if (!game || game.id !== gameId) {
      return interaction.reply({ content: 'This trivia game has already ended or no longer exists.', ephemeral: true });
    }
    
    if (action === 'cancel') {
      // Only the host can cancel the game
      if (interaction.user.id !== game.hostId) {
        return interaction.reply({ content: 'Only the host can end the game.', ephemeral: true });
      }
      
      // End the game manually
      await interaction.deferUpdate();
      this.endTriviaGame(interaction.client, interaction.channelId, false);
      
      logger.info(`User ${interaction.user.tag} manually ended a trivia game in channel ${interaction.channelId}`);
    } else if (action === 'answer') {
      // Check if the user has already answered
      if (game.participants.has(interaction.user.id)) {
        return interaction.reply({ content: 'You have already answered this question!', ephemeral: true });
      }
      
      // Record the user's answer
      const answerIndex = parseInt(answerId, 10);
      game.participants.set(interaction.user.id, answerIndex);
      
      // Confirm the answer was recorded
      await interaction.reply({ content: `Your answer has been recorded! (${game.question.options[answerIndex]})`, ephemeral: true });
      
      logger.info(`User ${interaction.user.tag} answered a trivia question in channel ${interaction.channelId}`);
    }
  },
  
  /**
   * Ends a trivia game and announces the results
   * @param {Client} client - The Discord client
   * @param {string} channelId - The channel ID
   * @param {boolean} isTimeout - Whether the game ended due to timeout
   */
  async endTriviaGame(client, channelId, isTimeout = false) {
    // Get the game data
    const game = activeGames.get(channelId);
    
    // Check if the game exists and hasn't already been ended
    if (!game) return;
    
    // Remove the game from active games
    activeGames.delete(channelId);
    
    try {
      // Get the channel
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) return;
      
      // Get the original message
      const message = await channel.messages.fetch(game.messageId).catch(() => null);
      if (!message) return;
      
      // Check if anyone participated
      const participants = Array.from(game.participants.entries());
      const correctParticipants = participants.filter(([_, answerIndex]) => answerIndex === game.question.answer);
      
      // Create an updated embed
      const embed = new EmbedBuilder()
        .setTitle(`Trivia Results: ${game.category.charAt(0).toUpperCase() + game.category.slice(1)}`)
        .setDescription(`**Question:**\n${game.question.question}`)
        .addFields(
          { name: 'Correct Answer', value: game.question.options[game.question.answer], inline: false },
          { name: 'Explanation', value: game.question.explanation, inline: false }
        )
        .setColor(correctParticipants.length > 0 ? '#43B581' : '#F04747')
        .setFooter({ text: `Game ended ${isTimeout ? 'due to time limit' : 'by host'} • Total participants: ${participants.length}` })
        .setTimestamp();
      
      // Add participant information if there were any
      if (participants.length > 0) {
        // Format participant list
        let correctUserMentions = await Promise.all(correctParticipants.map(async ([userId]) => {
          try {
            const user = await client.users.fetch(userId);
            return `<@${userId}> (${user.tag})`;
          } catch (error) {
            return `<@${userId}>`;
          }
        }));
        
        let participantStats = `**Correct Answers (${correctParticipants.length}/${participants.length}):**\n`;
        
        if (correctParticipants.length > 0) {
          participantStats += correctUserMentions.join('\n');
        } else {
          participantStats += 'No one answered correctly!';
        }
        
        embed.addFields({ name: 'Participants', value: participantStats, inline: false });
      } else {
        embed.addFields({ name: 'Participants', value: 'No one answered the question!', inline: false });
      }
      
      // Update the message with results and disable buttons
      await message.edit({
        embeds: [embed],
        components: []
      });
      
      logger.info(`Trivia game ended in channel ${channelId} with ${participants.length} participants`);
    } catch (error) {
      logger.error(`Error ending trivia game: ${error.message}`);
    }
  }
};
