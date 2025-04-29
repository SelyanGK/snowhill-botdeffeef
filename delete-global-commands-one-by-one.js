const { REST, Routes } = require('discord.js');
const logger = require('./utils/logger');

// Utiliser le même token que index.js
const token = "MTM2NDY4NDc0MDcxNTg3MjMxNw.GDyJUs.C-tks28m9D8y6H81apb3GCwdsgCAazaHkwFe3c";
const clientId = "1364684740715872317";

// Créer le client REST avec le token
const rest = new REST({ version: '10' }).setToken(token);

// Fonction pour attendre un certain temps
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function deleteGlobalCommandsOneByOne() {
  try {
    logger.info('Début du nettoyage des commandes globales une par une...');
    console.log('Début du nettoyage des commandes globales une par une...');
    
    // 1. Récupération des commandes globales
    const globalCommands = await rest.get(
      Routes.applicationCommands(clientId)
    );
    
    logger.info(`Trouvé ${globalCommands.length} commandes globales à supprimer`);
    console.log(`Trouvé ${globalCommands.length} commandes globales à supprimer`);
    
    // 2. Suppression des commandes une par une avec un délai
    let successCount = 0;
    
    for (const command of globalCommands) {
      try {
        logger.info(`Suppression de la commande globale: ${command.name} (${command.id})`);
        console.log(`Suppression de la commande globale: ${command.name} (${command.id})`);
        
        await rest.delete(
          Routes.applicationCommand(clientId, command.id)
        );
        
        logger.info(`Commande globale supprimée: ${command.name}`);
        console.log(`Commande globale supprimée: ${command.name}`);
        
        successCount++;
        
        // Attendre 1 seconde entre chaque suppression pour éviter les rate limits
        await wait(1000);
      } catch (error) {
        logger.error(`Erreur lors de la suppression de ${command.name}: ${error.message}`);
        console.error(`Erreur lors de la suppression de ${command.name}:`, error.message);
        
        // Attendre plus longtemps en cas d'erreur (probablement un rate limit)
        await wait(5000);
      }
    }
    
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

deleteGlobalCommandsOneByOne();