const { REST, Routes } = require('discord.js');

// Utiliser le même token que index.js
const token = "MTM2NDY4NDc0MDcxNTg3MjMxNw.GDyJUs.C-tks28m9D8y6H81apb3GCwdsgCAazaHkwFe3c";
const clientId = "1364684740715872317";

// Créer le client REST avec le token
const rest = new REST({ version: '10' }).setToken(token);

async function checkGlobalCommands() {
  try {
    console.log("Vérification des commandes globales...");
    
    const globalCommands = await rest.get(
      Routes.applicationCommands(clientId)
    );
    
    console.log(`Trouvé ${globalCommands.length} commandes globales:`);
    globalCommands.forEach(cmd => console.log(` - ${cmd.name} (${cmd.id})`));
    
  } catch (error) {
    console.error("Erreur:", error);
  }
}

checkGlobalCommands();