const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');
const EmbedCreator = require('../../utils/embedCreator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vouch')
    .setDescription('Send a vouch reminder to a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to send the vouch reminder to')
        .setRequired(true))
    // Everyone can see the command, but only users with Manage Messages permission can use it
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  cooldown: 10,
  
  /**
   * Executes the vouch command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    // Defer reply as ephemeral immediately to ensure we don't timeout
    await interaction.deferReply({ ephemeral: true });
    
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
      
      // Edit the deferred reply with success message
      await interaction.editReply({ 
        content: `Sent vouch message to ${targetUser}!`
      });
    } catch (error) {
      // Handle error if DM cannot be sent
      const logger = require('../../utils/logger');
      logger.error(`Could not send vouch DM to ${targetUser.tag} (${targetUser.id}): ${error.message}`);
      
      // Log more details about the error for debugging
      if (error.code) {
        logger.debug(`Error code: ${error.code}, Status: ${error.status || 'N/A'}`);
      }
      
      // Try to send a message in the channel as a fallback
      try {
        // Send the message in channel but set it to auto-delete after 30 seconds
        const fallbackMsg = await interaction.channel.send({ 
          content: `${targetUser}, please check your vouch reminder:`,
          embeds: [vouchEmbed]
        });
        
        // Delete the message after 30 seconds
        setTimeout(() => {
          fallbackMsg.delete().catch(e => logger.error(`Could not delete fallback vouch message: ${e.message}`));
        }, 30000);
        
        // Edit the deferred reply with partial success message
        await interaction.editReply({ 
          content: `\❌ Could not send a DM to ${targetUser}, but sent a temporary message in the channel instead. This could be due to:\n• The user has temporarily blocked DMs from server members\n• The user has privacy settings that prevent the bot from messaging them\n• A temporary Discord API issue`
        });
      } catch (fallbackError) {
        // If sending in channel also fails, edit the reply with complete error message
        logger.error(`Failed to send fallback vouch message in channel: ${fallbackError.message}`);
        
        await interaction.editReply({ 
          content: `\❌ Could not send a vouch reminder to ${targetUser} via DM or in channel. This could be due to:\n• The user has temporarily blocked DMs from server members\n• The user has privacy settings that prevent the bot from messaging them\n• A temporary Discord API issue`
        });
      }
    }
  },
};
