const { REST, Routes } = require('discord.js');
const logger = require('./utils/logger');

// Utiliser le même token que index.js
const token = "MTM2NDY4NDc0MDcxNTg3MjMxNw.GDyJUs.C-tks28m9D8y6H81apb3GCwdsgCAazaHkwFe3c";
const clientId = "1364684740715872317";
const guildId = "1321561162717855834";

// Liste des commandes restantes à supprimer
const remainingCommandsToDelete = [
  'automod', '8ball', 'coinflip', 'joke', 'giveaway', 
  'gend', 'glist', 'greroll', 'antiping', 'unsticky', 'sticky'
];

// Créer le client REST avec le token
const rest = new REST({ version: '10' }).setToken(token);

async function finalCleanup() {
  try {
    console.log('Nettoyage final des commandes...');
    logger.info('Nettoyage final des commandes...');
    
    // Suppression des commandes par ID directement
    const commandIds = {
      'automod': '1366731545674645524',
      '8ball': '1366734048093016085',
      'coinflip': '1366734048093016086',
      'joke': '1366734048093016087',
      'giveaway': '1366734048093016088',
      'gend': '1366734048093016089',
      'glist': '1366734048093016090',
      'greroll': '1366734048093016091',
      'antiping': '1366734048093016092',
      'unsticky': '1366734048093016093',
      'sticky': '1366734048315179048'
    };
    
    // Suppression des commandes une par une
    let deletedCount = 0;
    
    for (const [name, id] of Object.entries(commandIds)) {
      try {
        console.log(`Suppression de la commande: ${name} (${id})`);
        logger.info(`Suppression de la commande: ${name} (${id})`);
        
        await rest.delete(
          Routes.applicationGuildCommand(clientId, guildId, id)
        );
        
        console.log(`Commande supprimée avec succès: ${name}`);
        logger.info(`Commande supprimée avec succès: ${name}`);
        
        deletedCount++;
        
        // Pause courte pour éviter le rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (error) {
        console.error(`Erreur lors de la suppression de ${name}:`, error);
        logger.error(`Erreur lors de la suppression de ${name}: ${error}`);
      }
    }
    
    console.log(`${deletedCount} commandes ont été supprimées`);
    logger.info(`${deletedCount} commandes ont été supprimées`);
    
    // Vérification finale
    const remainingCommands = await rest.get(
      Routes.applicationGuildCommands(clientId, guildId)
    );
    
    console.log(`Après nettoyage, il reste ${remainingCommands.length} commandes`);
    logger.info(`Après nettoyage, il reste ${remainingCommands.length} commandes`);
    
    if (remainingCommands.length > 0) {
      console.log("Commandes restantes:");
      logger.info("Commandes restantes:");
      
      remainingCommands.forEach(cmd => {
        console.log(` - ${cmd.name} (${cmd.id})`);
        logger.info(` - ${cmd.name} (${cmd.id})`);
      });
    } else {
      console.log("Toutes les commandes ont été supprimées avec succès!");
      logger.info("Toutes les commandes ont été supprimées avec succès!");
    }
    
    console.log("Redémarrez le bot pour redéployer les commandes proprement");
    logger.info("Redémarrez le bot pour redéployer les commandes proprement");
    
  } catch (error) {
    console.error("Erreur lors du nettoyage final:", error);
    logger.error(`Erreur lors du nettoyage final: ${error}`);
  }
}

finalCleanup();