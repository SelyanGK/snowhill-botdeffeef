const { Client, GatewayIntentBits } = require('discord.js');

// Create a minimal client just for testing
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Get token from environment variable
const token = process.env.DISCORD_TOKEN;

console.log('Starting token test...');
console.log(`Token length: ${token ? token.length : 0} characters`);
console.log(`First 5 characters: ${token ? token.substring(0, 5) : 'none'}`);
console.log(`Last 5 characters: ${token ? token.substring(token.length - 5) : 'none'}`);

// Try to login
client.once('ready', () => {
  console.log(`✅ SUCCESS: Logged in as ${client.user.tag}`);
  client.destroy(); // Properly disconnect
  process.exit(0);
});

client.on('error', (error) => {
  console.error(`❌ ERROR: ${error.message}`);
  process.exit(1);
});

client.login(token).catch(error => {
  console.error(`❌ LOGIN FAILED: ${error.message}`);
  
  // Provide guidance based on the error
  if (error.message.includes('invalid token')) {
    console.log('\n--- TROUBLESHOOTING TIPS ---');
    console.log('1. Check that your token is correct');
    console.log('2. Make sure there are no spaces or special characters');
    console.log('3. Try regenerating the token in the Discord Developer Portal');
    console.log('4. Ensure the bot is enabled in the Discord Developer Portal');
    console.log('5. Check that you have the proper intents enabled for your bot');
  }
  
  process.exit(1);
});