const { REST, Routes } = require('discord.js');
const logger = require('./utils/logger');

// Use the same token that index.js uses
const token = "MTM2NDY4NDc0MDcxNTg3MjMxNw.GDyJUs.C-tks28m9D8y6H81apb3GCwdsgCAazaHkwFe3c";
const clientId = "1364684740715872317";
const guildId = "1321561162717855834";

// Create REST client with token
const rest = new REST({ version: '10' }).setToken(token);

async function main() {
  try {
    logger.info('Starting duplicate command cleanup process...');
    
    // Step 1: Get all existing commands from the guild
    logger.info(`Fetching existing commands from guild: ${guildId}`);
    
    const existingCommands = await rest.get(
      Routes.applicationGuildCommands(clientId, guildId)
    );
    
    logger.info(`Found ${existingCommands.length} existing commands`);
    
    // Step 2: Delete all commands one by one but only what we actually need to delete
    // We target specific commands that are causing duplication issues
    
    // All of these commands will be reinstalled by the bot properly
    const commandsToDelete = existingCommands.filter(cmd => 
      ['glist', 'greroll', 'antiping', 'automod', 'unsticky', 'sticky'].includes(cmd.name)
    );
    
    logger.info(`Identified ${commandsToDelete.length} commands to delete`);
    
    if (commandsToDelete.length === 0) {
      logger.info('No commands need to be deleted. Exiting.');
      return;
    }
    
    for (const command of commandsToDelete) {
      logger.info(`Deleting command: ${command.name} (${command.id})`);
      
      await rest.delete(
        Routes.applicationGuildCommand(clientId, guildId, command.id)
      );
      
      logger.info(`Successfully deleted command: ${command.name}`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    logger.info('Targeted commands have been deleted');
    logger.info('The bot will automatically reregister these commands on next startup');
    
    console.log('Command cleanup complete!');
    console.log('Please restart the bot to register the commands again.');
    
  } catch (error) {
    logger.error(`Error in command cleanup process: ${error}`);
    console.error('Error:', error);
  }
}

main();