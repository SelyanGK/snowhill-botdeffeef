const { REST, Routes } = require('discord.js');

// Utiliser le même token que index.js
const token = "MTM2NDY4NDc0MDcxNTg3MjMxNw.GDyJUs.C-tks28m9D8y6H81apb3GCwdsgCAazaHkwFe3c";
const clientId = "1364684740715872317";
const guildId = "1321561162717855834";

// Créer le client REST avec le token
const rest = new REST({ version: '10' }).setToken(token);

// Les vieilles commandes à supprimer (IDs spécifiques)
const oldCommands = [
  { name: 'gend', id: '1366734048093016089' },
  { name: 'glist', id: '1366734048093016090' },
  { name: 'greroll', id: '1366734048093016091' },
  { name: 'antiping', id: '1366734048093016092' },
  { name: 'unsticky', id: '1366734048093016093' },
  { name: 'sticky', id: '1366734048315179048' }
];

async function deleteOldCommands() {
  // Pour éviter le timeout, lançons toutes les suppressions en même temps
  try {
    console.log("Lancement de la suppression des anciennes commandes...");
    
    // Supprimer toutes les commandes en parallèle
    await Promise.all(oldCommands.map(cmd => {
      console.log(`Suppression de ${cmd.name} (${cmd.id})...`);
      
      return rest.delete(
          Routes.applicationGuildCommand(clientId, guildId, cmd.id)
        )
        .then(() => console.log(`✓ ${cmd.name} supprimé`))
        .catch(error => console.error(`✗ Erreur pour ${cmd.name}:`, error.message));
    }));
    
    console.log("Suppression terminée !");
    
    // Vérification finale
    const remainingCommands = await rest.get(
      Routes.applicationGuildCommands(clientId, guildId)
    );
    
    console.log(`Il reste ${remainingCommands.length} commandes:`);
    remainingCommands.forEach(cmd => console.log(` - ${cmd.name} (${cmd.id})`));
    
  } catch (error) {
    console.error("Erreur générale:", error);
  }
}

deleteOldCommands();