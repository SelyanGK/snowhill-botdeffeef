const { SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Languages for text to speech
const LANGUAGES = [
  { name: 'English (US)', value: 'en-US' },
  { name: 'English (UK)', value: 'en-GB' },
  { name: 'Spanish', value: 'es-ES' },
  { name: 'French', value: 'fr-FR' },
  { name: 'German', value: 'de-DE' },
  { name: 'Italian', value: 'it-IT' },
  { name: 'Japanese', value: 'ja-JP' },
  { name: 'Korean', value: 'ko-KR' },
  { name: 'Portuguese', value: 'pt-BR' },
  { name: 'Russian', value: 'ru-RU' },
  { name: 'Chinese', value: 'zh-CN' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tts')
    .setDescription('Convert text to speech')
    .addStringOption(option =>
      option.setName('text')
        .setDescription('The text to convert to speech')
        .setRequired(true)
        .setMaxLength(200))
    .addStringOption(option =>
      option.setName('language')
        .setDescription('The language to use')
        .setRequired(false)
        .addChoices(...LANGUAGES))
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
  
  cooldown: 15, // Longer cooldown to prevent abuse
  
  /**
   * Generate a text-to-speech audio file and send it
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const text = interaction.options.getString('text');
      const language = interaction.options.getString('language') || 'en-US';
      
      if (text.length === 0) {
        return interaction.editReply('Please provide some text to convert to speech.');
      }
      
      // Create a unique filename for this TTS request
      const timestamp = Date.now();
      const userId = interaction.user.id;
      const outputDir = path.join(__dirname, '..', '..', 'temp');
      const outputPath = path.join(outputDir, `tts_${userId}_${timestamp}.mp3`);
      
      // Create temp directory if it doesn't exist
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // In a real environment, you would use a proper TTS API or library
      // For this example, we'll simulate the process with ffmpeg and generate a silent audio file
      // In production, replace this with a call to a TTS service like Google Cloud TTS, AWS Polly, etc.
      
      // Simulating TTS generation
      await this.simulateTTS(text, language, outputPath);
      
      // Check if the file was created
      if (!fs.existsSync(outputPath)) {
        return interaction.editReply('Failed to generate the speech audio. Please try again later.');
      }
      
      // Create an attachment from the file
      const attachment = new AttachmentBuilder(outputPath, { name: 'speech.mp3' });
      
      // Send the audio file
      await interaction.editReply({
        content: `Text to speech for: "${text.length > 30 ? text.substring(0, 30) + '...' : text}"`,
        files: [attachment]
      });
      
      // Delete the file after a short delay
      setTimeout(() => {
        fs.unlink(outputPath, (err) => {
          if (err) logger.error(`Failed to delete temporary TTS file: ${err.message}`);
        });
      }, 10000);
      
      logger.info(`User ${interaction.user.tag} generated TTS for text: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
    } catch (error) {
      logger.error(`Error executing TTS command: ${error.message}`);
      await interaction.editReply('An error occurred while generating the speech. Please try again later.');
    }
  },
  
  /**
   * Simulate TTS generation with ffmpeg
   * @param {string} text - The text to convert
   * @param {string} language - The language code
   * @param {string} outputPath - Path to save the audio file
   */
  async simulateTTS(text, language, outputPath) {
    try {
      // In a real implementation, you would call a TTS service here
      // For this example, we'll just create a 3-second silent audio file with ffmpeg
      
      // The duration should depend on the text length - roughly 1 second per 5 words
      const wordCount = text.split(/\s+/).length;
      const duration = Math.max(1, Math.min(10, wordCount / 5));
      
      // Create a silent audio file with the calculated duration
      const command = `ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t ${duration} -q:a 9 -acodec libmp3lame ${outputPath}`;
      
      // Execute the ffmpeg command
      await execPromise(command);
      
      return true;
    } catch (error) {
      logger.error(`Error simulating TTS: ${error.message}`);
      throw new Error('Failed to generate speech audio');
    }
  }
};