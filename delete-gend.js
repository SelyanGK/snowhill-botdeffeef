const { REST, Routes } = require('discord.js');

// Utiliser le même token que index.js
const token = "MTM2NDY4NDc0MDcxNTg3MjMxNw.GDyJUs.C-tks28m9D8y6H81apb3GCwdsgCAazaHkwFe3c";
const clientId = "1364684740715872317";
const guildId = "1321561162717855834";

// Créer le client REST avec le token
const rest = new REST({ version: '10' }).setToken(token);

async function deleteCommand() {
  try {
    const commandId = '1366734048093016089'; // gend
    console.log(`Suppression de gend (${commandId})...`);
    
    await rest.delete(
      Routes.applicationGuildCommand(clientId, guildId, commandId)
    );
    
    console.log('Commande gend supprimée avec succès');
  } catch (error) {
    console.error('Erreur:', error);
  }
}

deleteCommand();