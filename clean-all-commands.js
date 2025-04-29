const { REST, Routes } = require('discord.js');
const logger = require('./utils/logger');

// Utiliser le même token que index.js
const token = "MTM2NDY4NDc0MDcxNTg3MjMxNw.GDyJUs.C-tks28m9D8y6H81apb3GCwdsgCAazaHkwFe3c";
const clientId = "1364684740715872317";
const guildId = "1321561162717855834";

// Créer le client REST avec le token
const rest = new REST({ version: '10' }).setToken(token);

async function cleanCommands() {
  try {
    console.log('Nettoyage complet des commandes en cours...');
    logger.info('Nettoyage complet des commandes en cours...');
    
    // 1. Récupération de toutes les commandes existantes
    console.log(`Récupération des commandes du serveur: ${guildId}`);
    logger.info(`Récupération des commandes du serveur: ${guildId}`);
    
    const existingGuildCommands = await rest.get(
      Routes.applicationGuildCommands(clientId, guildId)
    );
    
    console.log(`Trouvé ${existingGuildCommands.length} commandes de serveur`);
    logger.info(`Trouvé ${existingGuildCommands.length} commandes de serveur`);
    
    // 2. Suppression des commandes de serveur
    console.log("Suppression des commandes de serveur...");
    logger.info("Suppression des commandes de serveur...");
    
    await Promise.all(existingGuildCommands.map(command => 
      rest.delete(Routes.applicationGuildCommand(clientId, guildId, command.id))
        .then(() => {
          console.log(`Commande supprimée: ${command.name}`);
          logger.info(`Commande supprimée: ${command.name}`);
        })
        .catch(error => {
          console.error(`Erreur lors de la suppression de la commande ${command.name}:`, error);
          logger.error(`Erreur lors de la suppression de la commande ${command.name}: ${error}`);
        })
    ));

    // Vérifier les commandes globales aussi
    console.log("Vérification des commandes globales...");
    logger.info("Vérification des commandes globales...");
    
    const existingGlobalCommands = await rest.get(
      Routes.applicationCommands(clientId)
    );
    
    console.log(`Trouvé ${existingGlobalCommands.length} commandes globales`);
    logger.info(`Trouvé ${existingGlobalCommands.length} commandes globales`);
    
    // Suppression des commandes globales si elles existent
    if (existingGlobalCommands.length > 0) {
      console.log("Suppression des commandes globales...");
      logger.info("Suppression des commandes globales...");
      
      await Promise.all(existingGlobalCommands.map(command => 
        rest.delete(Routes.applicationCommand(clientId, command.id))
          .then(() => {
            console.log(`Commande globale supprimée: ${command.name}`);
            logger.info(`Commande globale supprimée: ${command.name}`);
          })
          .catch(error => {
            console.error(`Erreur lors de la suppression de la commande globale ${command.name}:`, error);
            logger.error(`Erreur lors de la suppression de la commande globale ${command.name}: ${error}`);
          })
      ));
    }
    
    console.log("TOUTES LES COMMANDES ONT ÉTÉ SUPPRIMÉES AVEC SUCCÈS");
    logger.info("TOUTES LES COMMANDES ONT ÉTÉ SUPPRIMÉES AVEC SUCCÈS");
    console.log("Redémarrez le bot pour réenregistrer les commandes proprement.");
    
  } catch (error) {
    console.error("Erreur lors du nettoyage des commandes:", error);
    logger.error(`Erreur lors du nettoyage des commandes: ${error}`);
  }
}

cleanCommands();