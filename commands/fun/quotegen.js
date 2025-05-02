const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config.json');

// Collection of quotes by category
const QUOTES = {
  inspirational: [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
    { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
    { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
    { text: "Success is not final, failure is not fatal: It is the courage to continue that counts.", author: "Winston Churchill" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison" }
  ],
  funny: [
    { text: "I'm not lazy, I'm on energy-saving mode.", author: "Unknown" },
    { text: "I'm on a seafood diet. I see food, and I eat it.", author: "Unknown" },
    { text: "Life is short. Smile while you still have teeth.", author: "Unknown" },
    { text: "A day without sunshine is like, you know, night.", author: "Steve Martin" },
    { text: "The road to success is always under construction.", author: "Lily Tomlin" },
    { text: "I didn't fail the test. I just found 100 ways to do it wrong.", author: "Benjamin Franklin" },
    { text: "If you think nobody cares if you're alive, try missing a couple of payments.", author: "Earl Wilson" },
    { text: "Never put off until tomorrow what you can do the day after tomorrow.", author: "Mark Twain" },
    { text: "I'm not superstitious, but I am a little stitious.", author: "Michael Scott" },
    { text: "I walk around like everything's fine, but deep down, inside my shoe, my sock is sliding off.", author: "Unknown" }
  ],
  wisdom: [
    { text: "The only true wisdom is in knowing you know nothing.", author: "Socrates" },
    { text: "The journey of a thousand miles begins with one step.", author: "Lao Tzu" },
    { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
    { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
    { text: "Knowing yourself is the beginning of all wisdom.", author: "Aristotle" },
    { text: "It is the mark of an educated mind to be able to entertain a thought without accepting it.", author: "Aristotle" },
    { text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss" },
    { text: "If you're going through hell, keep going.", author: "Winston Churchill" },
    { text: "Knowledge speaks, but wisdom listens.", author: "Jimi Hendrix" },
    { text: "We must not allow other people's limited perceptions to define us.", author: "Virginia Satir" }
  ],
  gaming: [
    { text: "The cake is a lie.", author: "Portal" },
    { text: "War. War never changes.", author: "Fallout" },
    { text: "It's dangerous to go alone! Take this.", author: "The Legend of Zelda" },
    { text: "A man chooses, a slave obeys.", author: "BioShock" },
    { text: "Nothing is true, everything is permitted.", author: "Assassin's Creed" },
    { text: "Do you feel like a hero yet?", author: "Spec Ops: The Line" },
    { text: "I used to be an adventurer like you, then I took an arrow in the knee.", author: "Skyrim" },
    { text: "Wake up, Mr. Freeman. Wake up and smell the ashes.", author: "Half-Life 2" },
    { text: "You have died of dysentery.", author: "The Oregon Trail" },
    { text: "Would you kindly?", author: "BioShock" }
  ],
  discord: [
    { text: "The chat's moving so fast no one will see me say I love this server.", author: "Random Discord User" },
    { text: "When in doubt, blame it on the ping.", author: "Discord Wisdom" },
    { text: "Discord: Where productivity goes to die.", author: "Unknown" },
    { text: "Never trust anyone with a Nitro badge.", author: "Server Veteran" },
    { text: "The mute button is the best feature, especially during family dinner.", author: "Discord Ninja" },
    { text: "That moment when you realize you've been talking for 5 minutes while muted.", author: "Every Discord User" },
    { text: "If someone has a custom status, they're definitely procrastinating.", author: "Discord Psychology" },
    { text: "The true Discord experience is having 50 unread servers and only caring about one DM.", author: "Discord Reality" },
    { text: "I'm not ignoring you, I just forgot to check that particular channel for 3 weeks.", author: "Guild Member" },
    { text: "Managing Discord roles is harder than managing real-life responsibilities.", author: "Server Admin" }
  ]
};

// Quote colors by category
const CATEGORY_COLORS = {
  inspirational: '#3498db', // Blue
  funny: '#e74c3c',        // Red
  wisdom: '#9b59b6',        // Purple
  gaming: '#2ecc71',        // Green
  discord: '#7289da'        // Discord Blue
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quotegen')
    .setDescription('Generate random quotes')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('The type of quote to generate')
        .setRequired(true)
        .addChoices(
          { name: 'Inspirational', value: 'inspirational' },
          { name: 'Funny', value: 'funny' },
          { name: 'Wisdom', value: 'wisdom' },
          { name: 'Gaming', value: 'gaming' },
          { name: 'Discord', value: 'discord' }
        ))
    .addBooleanOption(option =>
      option.setName('public')
        .setDescription('Show the quote publicly in the channel (default: private)')),
  
  cooldown: 5,

  /**
   * Execute the quotegen command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const category = interaction.options.getString('category');
    const isPublic = interaction.options.getBoolean('public') || false;
    
    try {
      if (!QUOTES[category] || QUOTES[category].length === 0) {
        return interaction.reply({
          content: 'Sorry, no quotes found for that category.',
          ephemeral: true
        });
      }
      
      // Get a random quote from the selected category
      const randomIndex = Math.floor(Math.random() * QUOTES[category].length);
      const quote = QUOTES[category][randomIndex];
      
      // Create an embed for the quote
      const embed = new EmbedBuilder()
        .setDescription(`"${quote.text}"`) 
        .setColor(CATEGORY_COLORS[category] || config.embedColor || '#3498db')
        .setFooter({ text: quote.author })
        .setTimestamp();
      
      // Add category-specific titles
      switch (category) {
        case 'inspirational':
          embed.setTitle('✨ Inspirational Quote');
          break;
        case 'funny':
          embed.setTitle('😄 Funny Quote');
          break;
        case 'wisdom':
          embed.setTitle('📖 Words of Wisdom');
          break;
        case 'gaming':
          embed.setTitle('🎮 Gaming Quote');
          break;
        case 'discord':
          embed.setTitle('💬 Discord Wisdom');
          break;
        default:
          embed.setTitle('Random Quote');
      }
      
      await interaction.reply({
        embeds: [embed],
        ephemeral: !isPublic
      });
      
      logger.info(`User ${interaction.user.tag} generated a ${category} quote`);
    } catch (error) {
      logger.error(`Error generating quote: ${error.message}`);
      await interaction.reply({
        content: 'An error occurred while generating your quote.',
        ephemeral: true
      });
    }
  }
};