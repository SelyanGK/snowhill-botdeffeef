const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the Magic 8-Ball a question')
    .addStringOption(option => 
      option.setName('question')
        .setDescription('The question you want to ask')
        .setRequired(true)),
  
  cooldown: 3,
  
  /**
   * Executes the 8ball command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const question = interaction.options.getString('question');
    
    // Array of possible 8-Ball responses
    const responses = [
      // Affirmative responses
      'It is certain.',
      'It is decidedly so.',
      'Without a doubt.',
      'Yes definitely.',
      'You may rely on it.',
      'As I see it, yes.',
      'Most likely.',
      'Outlook good.',
      'Yes.',
      'Signs point to yes.',
      
      // Non-committal responses
      'Reply hazy, try again.',
      'Ask again later.',
      'Better not tell you now.',
      'Cannot predict now.',
      'Concentrate and ask again.',
      
      // Negative responses
      'Don\'t count on it.',
      'My reply is no.',
      'My sources say no.',
      'Outlook not so good.',
      'Very doubtful.'
    ];
    
    // Get a random response
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    // Determine color based on the type of response
    let color;
    if (randomResponse.includes('yes') || randomResponse.includes('certain') || 
        randomResponse.includes('definitely') || randomResponse.includes('doubt') || 
        randomResponse.includes('rely') || randomResponse.includes('likely') || 
        randomResponse.includes('good')) {
      color = '#2ecc71'; // Green for positive
    } else if (randomResponse.includes('hazy') || randomResponse.includes('again') || 
               randomResponse.includes('later') || randomResponse.includes('predict') || 
               randomResponse.includes('concentrate')) {
      color = '#f39c12'; // Yellow/Orange for neutral
    } else {
      color = '#e74c3c'; // Red for negative
    }
    
    // Send the 8-Ball response
    await interaction.reply({
      embeds: [{
        title: '🎱 Magic 8-Ball',
        fields: [
          { name: 'Question', value: question },
          { name: 'Answer', value: randomResponse }
        ],
        color: parseInt(color.replace('#', ''), 16),
        thumbnail: {
          url: 'https://cdn.discordapp.com/attachments/REPLACE_THIS_WITH_YOUR_CHANNEL_ID/magic8ball.png'
        },
        footer: {
          text: `Asked by ${interaction.user.tag}`,
          icon_url: interaction.user.displayAvatarURL({ dynamic: true })
        },
        timestamp: new Date().toISOString()
      }]
    });
  },
};
