const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('joke')
    .setDescription('Get a random joke')
    .addStringOption(option => 
      option.setName('category')
        .setDescription('The category of joke')
        .setRequired(false)
        .addChoices(
          { name: 'Programming', value: 'programming' },
          { name: 'Miscellaneous', value: 'misc' },
          { name: 'Dark', value: 'dark' },
          { name: 'Pun', value: 'pun' },
          { name: 'Spooky', value: 'spooky' },
          { name: 'Christmas', value: 'christmas' }
        )),
  
  cooldown: 5,
  
  /**
   * Executes the joke command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    // Defer the reply
    await interaction.deferReply();
    
    const category = interaction.options.getString('category') || 'any';
    
    // Jokes database
    const jokes = {
      programming: [
        "Why do programmers prefer dark mode? Because light attracts bugs!",
        "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
        "A SQL query walks into a bar, walks up to two tables and asks, 'Can I join you?'",
        "Why do Java developers wear glasses? Because they don't C#!",
        "What's the object-oriented way to become wealthy? Inheritance.",
        "Why did the programmer quit his job? Because he didn't get arrays.",
        "What do you call a programmer from Finland? Nerdic.",
        "Why do programmers always mix up Halloween and Christmas? Because Oct 31 == Dec 25."
      ],
      misc: [
        "I told my wife she was drawing her eyebrows too high. She looked surprised.",
        "What's the difference between a snowman and a snowwoman? Snowballs.",
        "What do you call fake spaghetti? An impasta.",
        "Why don't scientists trust atoms? Because they make up everything.",
        "What did the janitor say when he jumped out of the closet? 'Supplies!'",
        "How do you organize a space party? You planet.",
        "Why don't eggs tell jokes? They'd crack each other up.",
        "I'm reading a book about anti-gravity. It's impossible to put down!"
      ],
      dark: [
        "What's the difference between a Ferrari and a dead body? I don't have a Ferrari in my garage.",
        "What's red and bad for your teeth? A brick.",
        "Why can't orphans play baseball? They don't know where home is.",
        "What did the cannibal do after dumping his girlfriend? Wiped his behind.",
        "Why did the blind man fall into the well? Because he couldn't see that well.",
        "What's the hardest part of a vegetable to eat? The wheelchair.",
        "What's the difference between a baby and an onion? No one cries when chopping up a baby."
      ],
      pun: [
        "I used to be a baker, but I couldn't make enough dough.",
        "I'm on a seafood diet. Every time I see food, I eat it.",
        "What do you call a bear with no teeth? A gummy bear.",
        "What do you call someone with no body and no nose? Nobody knows.",
        "I don't trust stairs. They're always up to something.",
        "Did you hear about the guy who invented Lifesavers? They say he made a mint.",
        "I used to hate facial hair, but then it grew on me."
      ],
      spooky: [
        "What do ghosts serve for dessert? I Scream.",
        "Where do zombies go swimming? The Dead Sea.",
        "What's a vampire's favorite fruit? Neck-tarines.",
        "Why don't mummies take vacations? They're afraid to unwind.",
        "What's a ghost's favorite dessert? Boo-berry pie.",
        "How do ghosts search the Web? They use ghoul-gle.",
        "What do you call a witch at the beach? A sand-witch."
      ],
      christmas: [
        "What do you call a snowman with a six-pack? An abdominal snowman.",
        "Why didn't Rudolph get a good report card? Because he went down in history.",
        "Why did Santa's helper see the doctor? Because he had low elf esteem.",
        "What nationality is Santa Claus? North Polish.",
        "What do you call a broke Santa? Saint Nickel-less.",
        "Why don't you ever see Santa in a hospital? Because he has private elf care."
      ]
    };
    
    // Get a random joke from the selected category or any category
    let joke;
    if (category === 'any') {
      // Flatten all jokes into a single array
      const allJokes = Object.values(jokes).flat();
      joke = allJokes[Math.floor(Math.random() * allJokes.length)];
    } else {
      joke = jokes[category][Math.floor(Math.random() * jokes[category].length)];
    }
    
    // Determine the emoji based on category
    let emoji = "😂";
    switch (category) {
      case 'programming': emoji = "💻"; break;
      case 'dark': emoji = "😈"; break;
      case 'pun': emoji = "😏"; break;
      case 'spooky': emoji = "👻"; break;
      case 'christmas': emoji = "🎅"; break;
    }
    
    // Send the joke
    await interaction.editReply({
      embeds: [{
        title: `${emoji} Random Joke`,
        description: joke,
        color: parseInt(config.embedColor.replace('#', ''), 16),
        footer: {
          text: `Category: ${category === 'any' ? 'Random' : category.charAt(0).toUpperCase() + category.slice(1)} • Requested by ${interaction.user.tag}`,
          icon_url: interaction.user.displayAvatarURL({ dynamic: true })
        },
        timestamp: new Date().toISOString()
      }]
    });
  },
};
