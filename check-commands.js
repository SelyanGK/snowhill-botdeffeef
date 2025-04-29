const { REST, Routes } = require('discord.js');

// Use the same token that index.js uses
const token = "MTM2NDY4NDc0MDcxNTg3MjMxNw.GDyJUs.C-tks28m9D8y6H81apb3GCwdsgCAazaHkwFe3c";
const clientId = "1364684740715872317";
const guildId = "1321561162717855834";

// Create REST client with token
const rest = new REST({ version: '10' }).setToken(token);

async function checkCommands() {
  try {
    console.log(`Fetching commands for guild: ${guildId}`);
    
    const commands = await rest.get(
      Routes.applicationGuildCommands(clientId, guildId)
    );
    
    console.log(`Found ${commands.length} commands:`);
    commands.forEach(cmd => console.log(` - ${cmd.name} (${cmd.id})`));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCommands();