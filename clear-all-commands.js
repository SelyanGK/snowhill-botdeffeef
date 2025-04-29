const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config.json');
const logger = require('./utils/logger');

// Create REST instance with token
const rest = new REST({ version: '10' }).setToken(config.token);

async function clearCommands() {
  try {
    logger.info('Started removing all global application commands...');
    await rest.put(Routes.applicationCommands(config.clientId), { body: [] });
    logger.info('Successfully removed all global application commands');

    // Clear commands for all guilds mentioned in the config
    if (config.guildIds && config.guildIds.length > 0) {
      for (const guildId of config.guildIds) {
        logger.info(`Removing commands from guild: ${guildId}`);
        await rest.put(
          Routes.applicationGuildCommands(config.clientId, guildId),
          { body: [] }
        );
        logger.info(`Successfully removed all commands from guild ${guildId}`);
      }
    }

    logger.info('All commands have been cleared. Now redeploying fresh commands...');
    
    // After clearing, redeploy commands
    await deployCommands();
    
    logger.info('All commands have been freshly redeployed. No more duplicates should exist.');
  } catch (error) {
    logger.error(`Error during command clearing: ${error}`);
  }
}

async function deployCommands() {
  const commands = [];
  const foldersPath = path.join(__dirname, 'commands');
  const commandFolders = fs.readdirSync(foldersPath);

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      
      if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        logger.info(`Added command: ${path.basename(file, '.js')} from ${folder}`);
      } else {
        logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
      }
    }
  }

  try {
    logger.info(`Started refreshing ${commands.length} application (/) commands.`);

    // Deploy to specified guilds
    if (config.guildIds && config.guildIds.length > 0) {
      for (const guildId of config.guildIds) {
        const data = await rest.put(
          Routes.applicationGuildCommands(config.clientId, guildId),
          { body: commands }
        );
        logger.info(`Successfully reloaded ${data.length} guild (/) commands for guild ${guildId}.`);
      }
    } else {
      // Global deployment if no guild IDs specified
      const data = await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands }
      );
      logger.info(`Successfully reloaded ${data.length} global application (/) commands.`);
    }
  } catch (error) {
    logger.error(`Error during command deployment: ${error}`);
  }
}

clearCommands().then(() => {
  console.log('Command cleanup and redeployment complete!');
}).catch(error => {
  console.error('Error in command cleanup process:', error);
});