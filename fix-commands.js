const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const logger = require('./utils/logger');

// Utilisez le token qui fonctionne pour se connecter
const token = "MTM2NDY4NDc0MDcxNTg3MjMxNw.GDyJUs.C-tks28m9D8y6H81apb3GCwdsgCAazaHkwFe3c";

// Force l'ID client à être celui du bot connecté
const clientId = "1364684740715872317";

// Force l'ID de guilde
// On peut laisser vide pour les commandes globales, ou spécifier pour un serveur spécifique
// Commandes de guilde = mise à jour immédiate, commandes globales = délai jusqu'à 1h
const guildId = "1321561162717855834"; // ID du serveur Snowhill selon les logs

async function main() {
  // Collect all commands
  const commands = [];
  const commandFolders = fs.readdirSync(path.join(__dirname, 'commands'));

  // Load all command files
  for (const folder of commandFolders) {
    const commandsPath = path.join(__dirname, 'commands', folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      
      if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        logger.info(`Added command: ${command.data.name} from ${folder}`);
      } else {
        logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
      }
    }
  }
  
  // Construct and prepare an instance of the REST module
  const rest = new REST().setToken(token);
  
  try {
    logger.info(`Démarrage du rafraîchissement de ${commands.length} commandes application (/)`);
    
    // The put method is used to fully refresh all commands
    let data;
    
    if (guildId) {
      // Guild commands - registers instantly, good for testing
      data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands },
      );
      logger.info(`Succès ! Rechargement de ${data.length} commandes de guilde (/)`);
    } else {
      // Global commands - can take up to an hour to register
      data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
      );
      logger.info(`Succès ! Rechargement de ${data.length} commandes globales (/)`);
    }
    
    console.log("Commandes deployees avec succes ! Patientez jusqu'a 1h pour les commandes globales.");
  } catch (error) {
    logger.error(`Erreur de déploiement des commandes: ${error}`);
    console.error(error);
  }
}

main().catch(console.error);