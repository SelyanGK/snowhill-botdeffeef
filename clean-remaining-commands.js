const { REST, Routes } = require('discord.js');
const logger = require('./utils/logger');

// Utiliser le même token que index.js
const token = "MTM2NDY4NDc0MDcxNTg3MjMxNw.GDyJUs.C-tks28m9D8y6H81apb3GCwdsgCAazaHkwFe3c";
const clientId = "1364684740715872317";
const guildId = "1321561162717855834";

// Liste des commandes restantes à supprimer
const remainingCommandsToDelete = [
  'embed', 'help', 'ping', 'serverinfo', 'userinfo', 
  'automod', '8ball', 'coinflip', 'joke', 'giveaway', 
  'gend', 'glist', 'greroll', 'antiping', 'unsticky', 'sticky'
];

// Créer le client REST avec le token
const rest = new REST({ version: '10' }).setToken(token);

async function cleanRemainingCommands() {
  try {
    console.log('Nettoyage des commandes restantes...');
    logger.info('Nettoyage des commandes restantes...');
    
    // Récupération des commandes existantes
    const existingCommands = await rest.get(
      Routes.applicationGuildCommands(clientId, guildId)
    );
    
    console.log(`Trouvé ${existingCommands.length} commandes restantes`);
    logger.info(`Trouvé ${existingCommands.length} commandes restantes`);
    
    // Filtrer les commandes à supprimer
    const commandsToDelete = existingCommands.filter(cmd => 
      remainingCommandsToDelete.includes(cmd.name)
    );
    
    console.log(`${commandsToDelete.length} commandes à supprimer`);
    logger.info(`${commandsToDelete.length} commandes à supprimer`);
    
    // Suppression des commandes une par une
    let deletedCount = 0;
    
    for (const command of commandsToDelete) {
      try {
        console.log(`Suppression de la commande: ${command.name} (${command.id})`);
        logger.info(`Suppression de la commande: ${command.name} (${command.id})`);
        
        await rest.delete(
          Routes.applicationGuildCommand(clientId, guildId, command.id)
        );
        
        console.log(`Commande supprimée avec succès: ${command.name}`);
        logger.info(`Commande supprimée avec succès: ${command.name}`);
        
        deletedCount++;
        
        // Pause pour éviter le rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (error) {
        console.error(`Erreur lors de la suppression de ${command.name}:`, error);
        logger.error(`Erreur lors de la suppression de ${command.name}: ${error}`);
      }
    }
    
    console.log(`${deletedCount} commandes ont été supprimées`);
    logger.info(`${deletedCount} commandes ont été supprimées`);
    
    console.log("Redémarrez le bot pour redéployer les commandes");
    logger.info("Redémarrez le bot pour redéployer les commandes");
    
  } catch (error) {
    console.error("Erreur lors du nettoyage des commandes:", error);
    logger.error(`Erreur lors du nettoyage des commandes: ${error}`);
  }
}

cleanRemainingCommands();