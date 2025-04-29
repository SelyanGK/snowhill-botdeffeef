const { REST, Routes } = require('discord.js');
const logger = require('./utils/logger');

// Utiliser le même token que index.js
const token = "MTM2NDY4NDc0MDcxNTg3MjMxNw.GDyJUs.C-tks28m9D8y6H81apb3GCwdsgCAazaHkwFe3c";
const clientId = "1364684740715872317";

// Créer le client REST avec le token
const rest = new REST({ version: '10' }).setToken(token);

async function deleteGlobalCommands() {
  try {
    logger.info('Début du nettoyage des commandes globales...');
    console.log('Début du nettoyage des commandes globales...');
    
    // 1. Récupération des commandes globales
    const globalCommands = await rest.get(
      Routes.applicationCommands(clientId)
    );
    
    logger.info(`Trouvé ${globalCommands.length} commandes globales à supprimer`);
    console.log(`Trouvé ${globalCommands.length} commandes globales à supprimer`);
    
    // 2. Suppression de toutes les commandes globales
    const deletionPromises = globalCommands.map(async command => {
      logger.info(`Suppression de la commande globale: ${command.name}`);
      console.log(`Suppression de la commande globale: ${command.name}`);
      
      try {
        await rest.delete(
          Routes.applicationCommand(clientId, command.id)
        );
        
        logger.info(`Commande globale supprimée: ${command.name}`);
        console.log(`Commande globale supprimée: ${command.name}`);
        
        return true;
      } catch (error) {
        logger.error(`Erreur lors de la suppression de ${command.name}: ${error.message}`);
        console.error(`Erreur lors de la suppression de ${command.name}:`, error.message);
        return false;
      }
    });
    
    // Exécution de toutes les suppressions en parallèle
    const results = await Promise.all(deletionPromises);
    const successCount = results.filter(result => result === true).length;
    
    logger.info(`${successCount}/${globalCommands.length} commandes globales supprimées`);
    console.log(`${successCount}/${globalCommands.length} commandes globales supprimées`);
    
    // Vérification finale
    const remainingGlobalCommands = await rest.get(
      Routes.applicationCommands(clientId)
    );
    
    if (remainingGlobalCommands.length === 0) {
      logger.info("Toutes les commandes globales ont été supprimées avec succès");
      console.log("Toutes les commandes globales ont été supprimées avec succès");
    } else {
      logger.warn(`Il reste encore ${remainingGlobalCommands.length} commandes globales`);
      console.warn(`Il reste encore ${remainingGlobalCommands.length} commandes globales:`);
      
      remainingGlobalCommands.forEach(cmd => {
        logger.warn(`- ${cmd.name} (${cmd.id})`);
        console.warn(`- ${cmd.name} (${cmd.id})`);
      });
    }
    
  } catch (error) {
    logger.error(`Erreur lors du nettoyage des commandes globales: ${error}`);
    console.error("Erreur lors du nettoyage des commandes globales:", error);
  }
}

deleteGlobalCommands();