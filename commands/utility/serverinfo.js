const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Displays information about the server'),
  
  cooldown: 10,
  
  /**
   * Executes the serverinfo command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    const { guild } = interaction;
    
    // Fetch guild data to ensure it's up-to-date
    await guild.fetch();
    
    // Get the creation date
    const creationDate = Math.floor(guild.createdTimestamp / 1000);
    
    // Get the verification level
    let verificationLevel = '';
    switch (guild.verificationLevel) {
      case 0: verificationLevel = 'None'; break;
      case 1: verificationLevel = 'Low'; break;
      case 2: verificationLevel = 'Medium'; break;
      case 3: verificationLevel = 'High'; break;
      case 4: verificationLevel = 'Very High'; break;
    }
    
    // Get the premium tier (boost level)
    const premiumTier = ['None', 'Level 1', 'Level 2', 'Level 3'][guild.premiumTier];
    
    // Count members and bots
    let memberCount = 0;
    let botCount = 0;
    
    guild.members.cache.forEach(member => {
      if (member.user.bot) {
        botCount++;
      } else {
        memberCount++;
      }
    });
    
    // Get channel counts
    const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
    const categoryChannels = guild.channels.cache.filter(c => c.type === 4).size;
    const forumChannels = guild.channels.cache.filter(c => c.type === 15).size;
    
    // Get role count (excluding @everyone)
    const roleCount = guild.roles.cache.size - 1;
    
    // Create the embed
    await interaction.reply({
      embeds: [{
        title: `📊 ${guild.name} Server Information`,
        description: guild.description || 'No description set',
        color: parseInt(config.embedColor.replace('#', ''), 16),
        thumbnail: {
          url: guild.iconURL({ dynamic: true, size: 1024 }) || 'https://cdn.discordapp.com/attachments/REPLACE_THIS_WITH_YOUR_CHANNEL_ID/default_guild_icon.png'
        },
        fields: [
          { name: 'ID', value: guild.id, inline: true },
          { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
          { name: 'Created', value: `<t:${creationDate}:R> (<t:${creationDate}:D>)`, inline: true },
          { name: 'Verification Level', value: verificationLevel, inline: true },
          { name: 'Boost Level', value: premiumTier, inline: true },
          { name: 'Boost Count', value: guild.premiumSubscriptionCount.toString(), inline: true },
          { name: 'Members', value: `👥 ${memberCount} humans\n🤖 ${botCount} bots\n👥 ${guild.memberCount} total`, inline: true },
          { name: 'Channels', value: `💬 ${textChannels} text\n🔊 ${voiceChannels} voice\n📁 ${categoryChannels} categories\n🗨️ ${forumChannels} forums\n📝 ${textChannels + voiceChannels + categoryChannels + forumChannels} total`, inline: true },
          { name: 'Roles', value: `👑 ${roleCount}`, inline: true },
          { name: 'Features', value: guild.features.length ? guild.features.map(f => `• ${f.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}`).join('\n') : 'None', inline: false }
        ],
        footer: {
          text: `Requested by ${interaction.user.tag}`,
          icon_url: interaction.user.displayAvatarURL({ dynamic: true })
        },
        timestamp: new Date().toISOString()
      }]
    });
  },
};
