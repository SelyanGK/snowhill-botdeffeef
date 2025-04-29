const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config.json');
const EmbedCreator = require('../../utils/embedCreator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Displays information about a user')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('The user to display information about')
        .setRequired(false)),
  
  cooldown: 5,
  
  /**
   * Executes the userinfo command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    // Get the target user (or use the author if none specified)
    const target = interaction.options.getUser('target') || interaction.user;
    
    // Fetch the GuildMember data if available
    const member = interaction.guild ? await interaction.guild.members.fetch(target.id).catch(() => null) : null;
    
    // Get the user's account creation date
    const creationDate = Math.floor(target.createdTimestamp / 1000);
    
    // Get the user's join date if they are a member
    const joinDate = member ? Math.floor(member.joinedTimestamp / 1000) : null;
    
    // Get member roles if they are a member (excluding @everyone)
    const roles = member ? 
      member.roles.cache
        .filter(role => role.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .map(role => `<@&${role.id}>`)
        .join(', ') || 'None' 
      : 'N/A';
    
    // Get member presence status if they are a member
    let presenceStatus = 'Offline';
    let statusEmoji = '⚫';
    if (member && member.presence) {
      switch (member.presence.status) {
        case 'online': presenceStatus = 'Online'; statusEmoji = '🟢'; break;
        case 'idle': presenceStatus = 'Idle'; statusEmoji = '🟡'; break;
        case 'dnd': presenceStatus = 'Do Not Disturb'; statusEmoji = '🔴'; break;
      }
    }
    
    // Get member activity if they are a member
    let activity = 'None';
    if (member && member.presence && member.presence.activities.length > 0) {
      const act = member.presence.activities[0];
      
      switch (act.type) {
        case 0: activity = `Playing ${act.name}`; break;
        case 1: activity = `Streaming ${act.name}`; break;
        case 2: activity = `Listening to ${act.name}`; break;
        case 3: activity = `Watching ${act.name}`; break;
        case 4: activity = `${act.name}`; break;
        case 5: activity = `Competing in ${act.name}`; break;
      }
      
      if (act.details) activity += ` - ${act.details}`;
    }
    
    // Prepare fields for the embed
    const fields = [
      { name: 'Account Created', value: `<t:${creationDate}:R> (<t:${creationDate}:D>)`, inline: true }
    ];
    
    // Add member-specific fields if they are in the server
    if (joinDate) fields.push({ name: 'Joined Server', value: `<t:${joinDate}:R> (<t:${joinDate}:D>)`, inline: true });
    if (member) {
      fields.push({ name: 'Nickname', value: member.nickname || 'None', inline: true });
      fields.push({ name: 'Status', value: presenceStatus, inline: true });
      fields.push({ name: 'Activity', value: activity, inline: true });
      fields.push({ name: 'Highest Role', value: member.roles.highest.id === interaction.guild.id ? 'None' : `<@&${member.roles.highest.id}>`, inline: true });
      fields.push({ name: `Roles [${member.roles.cache.size - 1}]`, value: roles, inline: false });
    }
    
    fields.push({ name: 'Bot', value: target.bot ? 'Yes' : 'No', inline: true });
    
    if (member && member.premiumSince) {
      fields.push({ name: 'Booster', value: `Yes, since <t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>`, inline: true });
    } else if (member) {
      fields.push({ name: 'Booster', value: 'No', inline: true });
    }
    
    // Determine color to use
    const color = member ? 
      (member.displayHexColor === '#000000' ? config.embedColor : member.displayHexColor) : 
      config.embedColor;
    
    // Create the embed using our utility
    const userEmbed = EmbedCreator.create({
      title: `${statusEmoji} ${target.tag} (${target.id})`,
      description: member ? `<@${target.id}>` : 'Not a member of this server',
      color: color,
      thumbnail: target.displayAvatarURL({ dynamic: true, size: 1024 }),
      fields: fields,
      footer: `Requested by ${interaction.user.tag}`
    });
    
    // Send the embed
    await interaction.reply({ embeds: [userEmbed] });
  },
};
