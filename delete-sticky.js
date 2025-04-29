const { REST, Routes } = require('discord.js');

// Utiliser le même token que index.js
const token = "MTM2NDY4NDc0MDcxNTg3MjMxNw.GDyJUs.C-tks28m9D8y6H81apb3GCwdsgCAazaHkwFe3c";
const clientId = "1364684740715872317";
const guildId = "1321561162717855834";

// Créer le client REST avec le token
const rest = new REST({ version: '10' }).setToken(token);

async function deleteStickyCommand() {
  try {
    const commandId = '1366734048315179048'; // sticky
    console.log(`Suppression de l'ancienne commande sticky (${commandId})...`);
    
    await rest.delete(
      Routes.applicationGuildCommand(clientId, guildId, commandId)
    );
    
    console.log('Commande sticky supprimée avec succès');
    
    // Vérification finale
    const remainingCommands = await rest.get(
      Routes.applicationGuildCommands(clientId, guildId)
    );
    
    console.log(`Il reste ${remainingCommands.length} commandes`);
    console.log("Le problème de commandes en double devrait être résolu");
    
  } catch (error) {
    console.error('Erreur:', error);
  }
}

deleteStickyCommand();