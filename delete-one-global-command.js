const { REST, Routes } = require('discord.js');
const logger = require('./utils/logger');

// Utiliser le même token que index.js
const token = "MTM2NDY4NDc0MDcxNTg3MjMxNw.GDyJUs.C-tks28m9D8y6H81apb3GCwdsgCAazaHkwFe3c";
const clientId = "1364684740715872317";

// Créer le client REST avec le token
const rest = new REST({ version: '10' }).setToken(token);

// Récupérer l'ID de la commande à supprimer depuis les arguments
const commandId = process.argv[2];

if (!commandId) {
  console.error("Veuillez fournir l'ID de la commande à supprimer en argument.");
  console.error("Exemple: node delete-one-global-command.js 1365284499570688002");
  process.exit(1);
}

async function deleteOneGlobalCommand(commandId) {
  try {
    // Récupérer la commande pour afficher son nom
    const globalCommands = await rest.get(
      Routes.applicationCommands(clientId)
    );
    
    const commandToDelete = globalCommands.find(cmd => cmd.id === commandId);
    
    if (!commandToDelete) {
      console.error(`Aucune commande trouvée avec l'ID: ${commandId}`);
      return;
    }
    
    console.log(`Suppression de la commande globale: ${commandToDelete.name} (${commandId})`);
    logger.info(`Suppression de la commande globale: ${commandToDelete.name} (${commandId})`);
    
    // Supprimer la commande
    await rest.delete(
      Routes.applicationCommand(clientId, commandId)
    );
    
    console.log(`Commande globale supprimée avec succès: ${commandToDelete.name}`);
    logger.info(`Commande globale supprimée avec succès: ${commandToDelete.name}`);
    
  } catch (error) {
    console.error(`Erreur lors de la suppression de la commande: ${error.message}`);
    logger.error(`Erreur lors de la suppression de la commande: ${error.message}`);
  }
}

deleteOneGlobalCommand(commandId);