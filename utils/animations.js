/**
 * Animations utility for creating visually appealing effects in Discord messages
 */

/**
 * Generates a confetti frame for discord messages
 * @param {number} density - How many confetti pieces to render (1-5)
 * @param {number} frame - Which animation frame (0-7)
 * @returns {string} - A string with confetti emojis arranged for the frame
 */
function generateConfettiFrame(density = 3, frame = 0) {
  // Confetti emojis
  const confetti = ['🎊', '🎉', '✨', '🎈', '🎆', '🎇', '🥳', '🎂', '🎁'];
  
  // Animated confetti patterns (simulating falling confetti)
  const patterns = [
    // Frame 0 
    [
      '　　　　　　　　　　　　　　　　',
      '　　　　　　　　　　　　　　　　',
      '　　　　　　　　　　　　　　　　',
      '　　　　　　　　　　　　　　　　',
      '　　　　　　　　　　　　　　　　',
    ],
    // Frame 1
    [
      '　%　　　　　　　%　　　　　　　',
      '　　　　　　　　　　　　　　　　',
      '　　　　　%　　　　　　%　　　　',
      '　　　　　　　　　　　　　　　　',
      '　　　　　　　　　　　　　　　　',
    ],
    // Frame 2
    [
      '　　　　　　　　　　　　　　　　',
      '　　%　　　　　%　　　　%　　　',
      '　　　　　　　　　　　　　　　　',
      '%　　　　　%　　　　　%　　　　',
      '　　　　　　　　　　　　　　　　',
    ],
    // Frame 3
    [
      '　　　　　　　　　　　　　　　　',
      '　　　　　　　　　　　　　　　　',
      '　%　　　%　　　%　　　%　　　%',
      '　　　　　　　　　　　　　　　　',
      '%　　　%　　　%　　　%　　　%　',
    ],
    // Frame 4
    [
      '　　　　　　　　　　　　　　　　',
      '%　　　%　　　%　　　%　　　%　',
      '　　　　　　　　　　　　　　　　',
      '　%　　　%　　　%　　　%　　　%',
      '　　　　　　　　　　　　　　　　',
    ],
    // Frame 5
    [
      '%　　　%　　　%　　　%　　　%　',
      '　　　　　　　　　　　　　　　　',
      '　%　　　%　　　%　　　%　　　%',
      '　　　　　　　　　　　　　　　　',
      '%　　　%　　　%　　　%　　　%　',
    ],
    // Frame 6
    [
      '　　　　　　　　　　　　　　　　',
      '　%　　　%　　　%　　　%　　　%',
      '　　　　　　　　　　　　　　　　',
      '%　　　%　　　%　　　%　　　%　',
      '　　　　　　　　　　　　　　　　',
    ],
    // Frame 7
    [
      '　%　　　%　　　%　　　%　　　%',
      '　　　　　　　　　　　　　　　　',
      '%　　　%　　　%　　　%　　　%　',
      '　　　　　　　　　　　　　　　　',
      '　%　　　%　　　%　　　%　　　%',
    ],
  ];

  // Select the pattern for the current frame
  const pattern = patterns[frame % patterns.length];
  
  // Apply confetti based on density
  let result = '';
  
  for (let line of pattern) {
    let modifiedLine = line;
    
    // Replace % with random confetti emojis based on density
    for (let i = 0; i < density; i++) {
      const confettiChar = confetti[Math.floor(Math.random() * confetti.length)];
      modifiedLine = modifiedLine.replace('%', confettiChar);
    }
    
    result += modifiedLine + '\n';
  }
  
  return result;
}

/**
 * Creates a congratulations header with animated styling
 * @param {string} text - The text to display in the header
 * @param {number} style - Style variation (0-2)
 * @returns {string} - Styled header text
 */
function createCongratulationsHeader(text, style = 0) {
  const styles = [
    // Style 0 - Stars
    `★·.·´¯\`·.·★ ${text} ★·.·´¯\`·.·★`,
    // Style 1 - Party
    `🎉 ${text} 🎉`,
    // Style 2 - Sparkles
    `✨✨✨ ${text} ✨✨✨`
  ];
  
  return styles[style % styles.length];
}

/**
 * Creates a celebratory announcement box for winners
 * @param {string} prize - The prize that was won
 * @param {string} winnerMentions - String with winner mention(s)
 * @param {number} frame - Animation frame number
 * @returns {string} - Formatted announcement message
 */
function createWinnerAnnouncement(prize, winnerMentions, frame = 0) {
  const confetti = generateConfettiFrame(3, frame);
  const header = createCongratulationsHeader('CONGRATULATIONS', frame % 3);
  
  return `${confetti}
${header}

🏆 **${prize}** 🏆

**Winner${winnerMentions.includes(',') ? 's' : ''}:**
${winnerMentions}

${generateConfettiFrame(2, (frame + 4) % 8)}`;
}

/**
 * Creates a giveaway launch announcement with countdown effect
 * @param {string} prize - The prize of the giveaway
 * @param {number} winnerCount - Number of winners
 * @param {string} duration - Formatted duration
 * @param {string} channelMention - The channel mention where giveaway is hosted
 * @returns {string} - Formatted launch announcement
 */
function createGiveawayLaunchMessage(prize, winnerCount, duration, channelMention) {
  return `🎉 **GIVEAWAY STARTED!** 🎉

🏆 **Prize:** ${prize}
👥 **Winners:** ${winnerCount}
⏱ **Duration:** ${duration}
📍 **Location:** ${channelMention}

The giveaway has been started! Click the button in ${channelMention} to enter!
Good luck to all participants! 🍀`;
}

module.exports = {
  generateConfettiFrame,
  createCongratulationsHeader,
  createWinnerAnnouncement,
  createGiveawayLaunchMessage
};