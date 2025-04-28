const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flips a coin'),
  
  cooldown: 3,
  
  /**
   * Executes the coinflip command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    // Get a random result (0 or 1)
    const result = Math.round(Math.random());
    
    // Heads or tails based on the result
    const side = result === 0 ? 'Heads' : 'Tails';
    
    // SVG graphics for each side
    const headsSvg = `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="#FFD700" stroke="#DAA520" stroke-width="2"/>
      <circle cx="50" cy="50" r="40" fill="#FFC800"/>
      <ellipse cx="50" cy="35" rx="12" ry="15" fill="#DAA520"/>
      <rect x="43" y="50" width="14" height="20" fill="#DAA520"/>
    </svg>
    `;
    
    const tailsSvg = `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="#FFD700" stroke="#DAA520" stroke-width="2"/>
      <circle cx="50" cy="50" r="40" fill="#FFC800"/>
      <text x="50" y="65" font-family="Arial" font-size="36" font-weight="bold" text-anchor="middle" fill="#DAA520">T</text>
    </svg>
    `;
    
    // Create a data URL for the appropriate SVG
    const svgContent = side === 'Heads' ? headsSvg : tailsSvg;
    
    // Send the result as an embed
    await interaction.reply({
      embeds: [{
        title: '🪙 Coin Flip Result',
        description: `The coin landed on **${side}**!`,
        color: parseInt(config.embedColor.replace('#', ''), 16),
        thumbnail: {
          url: side === 'Heads' 
            ? 'https://cdn.discordapp.com/attachments/REPLACE_THIS_WITH_YOUR_CHANNEL_ID/heads.png'
            : 'https://cdn.discordapp.com/attachments/REPLACE_THIS_WITH_YOUR_CHANNEL_ID/tails.png'
        },
        footer: {
          text: `Flipped by ${interaction.user.tag}`,
          icon_url: interaction.user.displayAvatarURL({ dynamic: true })
        },
        timestamp: new Date().toISOString()
      }]
    });
  },
};
