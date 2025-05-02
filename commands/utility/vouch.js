const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config.json');
const EmbedCreator = require('../../utils/embedCreator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vouch')
    .setDescription('Send a vouch reminder to a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to send the vouch reminder to')
        .setRequired(true)),
  
  cooldown: 10,
  
  /**
   * Executes the vouch command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    // Get the target user from options
    const targetUser = interaction.options.getUser('user');
    
    // Create the embed to send to the user
    const vouchEmbed = EmbedCreator.warning(
      'Vouch Reminder',
      `Hello ${targetUser}!
You got your chosen reward, so please vouch the Claim Manager in https://discord.com/channels/1321561162717855834/1321574882869510219

Please do it to avoid getting punished!
- Snowhill Staff Team`,
      {
        footer: `Sent by ${interaction.user.tag}`
      }
    );
    
    try {
      // Send DM to the target user
      await targetUser.send({ embeds: [vouchEmbed] });
      
      // Reply with ephemeral confirmation message
      await interaction.reply({ 
        content: `Sent vouch message to ${targetUser}!`, 
        ephemeral: true 
      });
    } catch (error) {
      // Handle error if DM cannot be sent
      console.error(`Could not send DM to ${targetUser.tag}`, error);
      await interaction.reply({ 
        content: `❌ Could not send a DM to ${targetUser}. They might have DMs disabled or blocked the bot.`, 
        ephemeral: true 
      });
    }
  },
};
