const { REST, Routes } = require('discord.js');
const config = require('./config.json');
const logger = require('./utils/logger');

// Hard-coded Discord token (same as in index.js)
const token = "MTM2NDY4NDc0MDcxNTg3MjMxNw.Gj-SGf.PdBQ8-tA24yiGsxzwdVDiCJx3qvgQ6uKqoe18M";

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// Main function to run the reset and registration
async function resetAndRegisterCommands() {
  try {
    // Step 1: Delete all existing commands (both global and guild-specific)
    logger.info('Started removing all existing application commands...');
    
    // Delete guild commands
    if (config.guildId) {
      logger.info(`Removing commands from guild: ${config.guildId}`);
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: [] },
      );
      logger.info('Successfully deleted all guild commands.');
    }
    
    // Delete global commands
    logger.info('Removing global commands...');
    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: [] },
    );
    logger.info('Successfully deleted all global commands.');
    
    // Wait a moment before registering new commands
    logger.info('Waiting a moment before registering new commands...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 2: Register new commands (by running the deploy-commands script)
    logger.info('Now running deploy-commands.js to register new commands...');
    require('./deploy-commands');
    
  } catch (error) {
    logger.error(`Error during command reset: ${error}`);
  }
}

// Execute the reset and registration
resetAndRegisterCommands();