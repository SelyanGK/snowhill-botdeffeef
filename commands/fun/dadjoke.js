const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config.json');

// Dad jokes list
const dadJokes = [
  "I'm afraid for the calendar. Its days are numbered.",
  "My wife said I should do lunges to stay in shape. That would be a big step forward.",
  "Why do fathers take an extra pair of socks when they go golfing? In case they get a hole in one!",
  "Singing in the shower is fun until you get soap in your mouth. Then it's a soap opera.",
  "What do you call a factory that makes okay products? A satisfactory.",
  "What did the ocean say to the beach? Nothing, it just waved.",
  "Why do seagulls fly over the ocean? Because if they flew over the bay, we'd call them bagels.",
  "I only know 25 letters of the alphabet. I don't know y.",
  "How does the moon cut his hair? Eclipse it.",
  "What did one wall say to the other? I'll meet you at the corner.",
  "What did the zero say to the eight? That belt looks good on you.",
  "A skeleton walks into a bar and says, 'Hey, bartender. I'll have one beer and a mop.'",
  "Where do fruits go on vacation? Pear-is!",
  "I asked my dog what's two minus two. He said nothing.",
  "What did Baby Corn say to Mama Corn? Where's Pop Corn?",
  "What's the best thing about Switzerland? I don't know, but the flag is a big plus.",
  "Did you hear about the mathematician who's afraid of negative numbers? He'll stop at nothing to avoid them.",
  "Why don't scientists trust atoms? Because they make up everything.",
  "Why did the scarecrow win an award? Because he was outstanding in his field.",
  "Why don't eggs tell jokes? They'd crack each other up.",
  "I'm reading a book about anti-gravity. It's impossible to put down!",
  "Did you hear about the guy who invented the knock-knock joke? He won the 'no-bell' prize.",
  "I've got a joke about construction, but I'm still working on it.",
  "What's the difference between a poorly dressed man on a trampoline and a well-dressed man on a trampoline? Attire.",
  "How do you organize a space party? You planet.",
  "Why couldn't the bicycle stand up by itself? It was two tired.",
  "Did you hear about the restaurant on the moon? Great food, no atmosphere.",
  "What do you call a fake noodle? An impasta.",
  "How do you make a tissue dance? You put a little boogie in it.",
  "Why did the coffee file a police report? It got mugged.",
  "What's the difference between a snowman and a snowwoman? Snowballs.",
  "What do you call a parade of rabbits hopping backwards? A receding hare-line.",
  "What do you call a cow with no legs? Ground beef.",
  "Why don't skeletons fight each other? They don't have the guts.",
  "How many apples grow on a tree? All of them.",
  "Did you hear the rumor about butter? Well, I'm not going to spread it.",
  "I told my wife she should embrace her mistakes. She gave me a hug.",
  "Why don't eggs tell jokes? They'd crack each other up.",
  "I'm on a seafood diet. I see food and I eat it.",
  "What's brown and sticky? A stick.",
  "Why can't you hear a pterodactyl go to the bathroom? The p is silent.",
  "What do you call a cow with two legs? Lean beef.",
  "What do you call a pig that does karate? A pork chop.",
  "Where do you learn to make ice cream? Sundae school.",
  "What do you call a can opener that doesn't work? A can't opener.",
  "Why did the tomato turn red? Because it saw the salad dressing.",
  "What did the buffalo say when his son left for college? Bison.",
  "Why did the scarecrow get a promotion? He was outstanding in his field."
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dadjoke')
    .setDescription('Get a classic dad joke'),
  
  cooldown: 3,
  
  /**
   * Executes the dadjoke command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    try {
      // Get a random dad joke from the list
      const randomIndex = Math.floor(Math.random() * dadJokes.length);
      const joke = dadJokes[randomIndex];
      
      // Create an embed for the joke
      const embed = new EmbedBuilder()
        .setTitle('👨 Dad Joke')
        .setDescription(joke)
        .setColor(config.embedColor || '#3498db')
        .setFooter({ text: "That's all folks!" })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
      logger.info(`User ${interaction.user.tag} received a dad joke`);
    } catch (error) {
      logger.error(`Error executing dadjoke command: ${error.message}`);
      await interaction.reply({
        content: 'Failed to tell a dad joke. Must have forgotten my punchline!',
        ephemeral: true
      });
    }
  }
};