// A minimal Discord.js bot just to test token authentication
const { Client, GatewayIntentBits } = require('discord.js');

// Create the client with minimal intents
const client = new Client({ 
  intents: [GatewayIntentBits.Guilds] 
});

// Get token from environment variable 
const token = process.env.DISCORD_TOKEN;

// Check if token looks valid (format check only)
if (!token || token.length < 50) {
  console.error('❌ The provided token appears to be invalid or too short.');
  console.error('   Discord tokens are typically 59-72 characters long.');
  process.exit(1);
}

console.log('🔑 Attempting to authenticate with Discord...');
console.log(`Token format appears correct (${token.length} characters)`);

// When the client is ready, run this code
client.once('ready', () => {
  console.log('✅ SUCCESS! Bot is logged in and ready!');
  console.log(`Logged in as: ${client.user.tag}`);
  console.log(`Bot User ID: ${client.user.id}`);
  client.destroy(); // Cleanly disconnect
  process.exit(0);
});

// Login to Discord
client.login(token).catch(error => {
  console.error('❌ AUTHENTICATION FAILED!');
  console.error(`Error: ${error.message}`);
  
  console.log('\n📋 TROUBLESHOOTING CHECKLIST:');
  console.log('1. Is the token copied correctly? (no spaces, correct case)');
  console.log('2. Has the token been reset recently in the Developer Portal?');
  console.log('3. Is the bot user enabled in the Developer Portal?');
  console.log('4. Is the MessageContent intent enabled in the Developer Portal?');
  
  process.exit(1);
});