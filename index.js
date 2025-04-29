const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config.json');
const logger = require('./utils/logger');
const { loadGiveaways, checkGiveaways } = require('./commands/giveaway/create');
const { handleStickyMessages } = require('./commands/sticky/set');

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message]
});

// Log the intents for debugging
logger.info(`Requesting intents: Guilds, GuildMessages, GuildMembers, MessageContent`);

// Create collections for commands and cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();

// Load all event files
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  
  logger.info(`Loaded event: ${event.name}`);
}

// Load all command files
const commandFolders = fs.readdirSync(path.join(__dirname, 'commands'));

for (const folder of commandFolders) {
  const commandsPath = path.join(__dirname, 'commands', folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      logger.info(`Loaded command: ${command.data.name} from ${folder}`);
    } else {
      logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}

// Create data directories if they don't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
  logger.info('Created data directory');
}

// Create giveaways.json if it doesn't exist
const giveawaysPath = path.join(dataDir, 'giveaways.json');
if (!fs.existsSync(giveawaysPath)) {
  fs.writeFileSync(giveawaysPath, JSON.stringify([], null, 2));
  logger.info('Created giveaways.json file');
}

// Create sticky.json if it doesn't exist
const stickyPath = path.join(dataDir, 'sticky.json');
if (!fs.existsSync(stickyPath)) {
  fs.writeFileSync(stickyPath, JSON.stringify({}, null, 2));
  logger.info('Created sticky.json file');
}

// Hard-coded Discord token
// This is not the recommended approach for production, but works for this example
const token = "MTM2NDY4NDc0MDcxNTg3MjMxNw.Gj-SGf.PdBQ8-tA24yiGsxzwdVDiCJx3qvgQ6uKqoe18M";

// Check if token is available
if (!token) {
  logger.error('Token decoding failed');
  process.exit(1);
}

// Login to Discord with your client's token
logger.info('Attempting to log in to Discord...');
client.login(token).then(() => {
  logger.info('Bot logged in successfully');
  
  // Load active giveaways
  loadGiveaways(client);
  
  // Check giveaways every minute
  setInterval(() => checkGiveaways(client), 60000);
  
  // Setup handler for sticky messages
  handleStickyMessages(client);
}).catch(error => {
  logger.error(`Error logging in: ${error.message}`);
  logger.error('Please check that your Discord token is valid and that the bot account is enabled');
  process.exit(1);
});

// Handle process errors
process.on('unhandledRejection', error => {
  logger.error(`Unhandled rejection: ${error}`);
});

process.on('uncaughtException', error => {
  logger.error(`Uncaught exception: ${error}`);
  process.exit(1);
});
