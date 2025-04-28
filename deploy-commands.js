const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('./config.json');
const logger = require('./utils/logger');

const commands = [];
const commandFolders = fs.readdirSync(path.join(__dirname, 'commands'));

// Load all command files
for (const folder of commandFolders) {
  const commandsPath = path.join(__dirname, 'commands', folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
      logger.info(`Added command: ${command.data.name} from ${folder}`);
    } else {
      logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}

// Hard-coded Discord token
// This is not the recommended approach for production, but works for this example
const token = "MTM2MjM2MDg4NTAzNjk3ODIxNg.Gj2YPw.zCvhiJgUPcB-S9RAgm76dw6qfO0OKpMucmPQ-4";

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// Deploy commands
(async () => {
  try {
    logger.info(`Started refreshing ${commands.length} application (/) commands.`);

    // The put method is used to fully refresh all commands
    let data;
    
    if (config.guildId) {
      // Guild commands - registers instantly, good for testing
      data = await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands },
      );
      logger.info(`Successfully reloaded ${data.length} guild (/) commands.`);
    } else {
      // Global commands - can take up to an hour to register
      data = await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands },
      );
      logger.info(`Successfully reloaded ${data.length} global (/) commands.`);
    }
  } catch (error) {
    logger.error(`Error deploying commands: ${error}`);
  }
})();
