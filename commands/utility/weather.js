const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('Check the weather for a location')
    .addStringOption(option =>
      option.setName('location')
        .setDescription('The city, country, or place to check weather for')
        .setRequired(true)),
  
  cooldown: 10,
  
  /**
   * Executes the weather command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const location = interaction.options.getString('location');
      
      // Simulate weather data (in a real bot, this would call a weather API with API key)
      // Replace with actual API call in production
      const weatherData = simulateWeatherData(location);
      
      // Create the embed
      const embed = new EmbedBuilder()
        .setTitle(`Weather for ${weatherData.location}`)
        .setDescription(`Current conditions: ${weatherData.condition}`)
        .addFields(
          { name: 'Temperature', value: `${weatherData.temperature}°C (${weatherData.temperatureF}°F)`, inline: true },
          { name: 'Feels Like', value: `${weatherData.feelsLike}°C (${weatherData.feelsLikeF}°F)`, inline: true },
          { name: 'Humidity', value: `${weatherData.humidity}%`, inline: true },
          { name: 'Wind', value: `${weatherData.windSpeed} km/h ${weatherData.windDirection}`, inline: true },
          { name: 'Visibility', value: `${weatherData.visibility} km`, inline: true },
          { name: 'Pressure', value: `${weatherData.pressure} hPa`, inline: true },
          { name: 'Last Updated', value: weatherData.lastUpdated, inline: false }
        )
        .setColor(getWeatherColor(weatherData.condition))
        .setThumbnail(weatherData.icon)
        .setFooter({ text: 'To use real weather data, configure a weather API key in the bot' })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      logger.info(`User ${interaction.user.tag} checked weather for ${location}`);
    } catch (error) {
      logger.error(`Error executing weather command: ${error.message}`);
      await interaction.editReply('An error occurred while fetching weather data. Please try again.');
    }
  }
};

/**
 * Simulates weather data for demonstration purposes
 * In a real bot, this would be replaced with an actual API call
 * @param {string} location - The location to get weather for
 * @returns {Object} Simulated weather data
 */
function simulateWeatherData(location) {
  // Weather conditions with corresponding icons
  const conditions = [
    { condition: 'Sunny', icon: 'https://cdn-icons-png.flaticon.com/512/6974/6974833.png' },
    { condition: 'Partly Cloudy', icon: 'https://cdn-icons-png.flaticon.com/512/1163/1163661.png' },
    { condition: 'Cloudy', icon: 'https://cdn-icons-png.flaticon.com/512/1163/1163624.png' },
    { condition: 'Light Rain', icon: 'https://cdn-icons-png.flaticon.com/512/1163/1163657.png' },
    { condition: 'Heavy Rain', icon: 'https://cdn-icons-png.flaticon.com/512/1163/1163626.png' },
    { condition: 'Thunderstorm', icon: 'https://cdn-icons-png.flaticon.com/512/1163/1163636.png' },
    { condition: 'Snow', icon: 'https://cdn-icons-png.flaticon.com/512/1163/1163637.png' },
    { condition: 'Fog', icon: 'https://cdn-icons-png.flaticon.com/512/1163/1163675.png' }
  ];
  
  // Wind directions
  const windDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  
  // Generate random weather data
  const tempC = Math.floor(Math.random() * 35) - 5;
  const feelsLikeC = tempC + (Math.random() * 5 - 2.5);
  const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
  
  // Calculate Fahrenheit temperatures
  const tempF = Math.round(tempC * 9/5 + 32);
  const feelsLikeF = Math.round(feelsLikeC * 9/5 + 32);
  
  // Format dates
  const now = new Date();
  const lastUpdated = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  return {
    location: location,
    temperature: tempC,
    temperatureF: tempF,
    feelsLike: Math.round(feelsLikeC),
    feelsLikeF: feelsLikeF,
    condition: randomCondition.condition,
    icon: randomCondition.icon,
    humidity: Math.floor(Math.random() * 100),
    windSpeed: Math.floor(Math.random() * 50),
    windDirection: windDirections[Math.floor(Math.random() * windDirections.length)],
    visibility: (Math.random() * 10).toFixed(1),
    pressure: Math.floor(Math.random() * 40) + 980,
    lastUpdated: lastUpdated
  };
}

/**
 * Gets an appropriate color for the weather condition
 * @param {string} condition - The weather condition
 * @returns {number} Hex color as integer
 */
function getWeatherColor(condition) {
  switch(condition.toLowerCase()) {
    case 'sunny':
      return 0xFFD700; // Gold
    case 'partly cloudy':
      return 0x87CEEB; // Sky Blue
    case 'cloudy':
      return 0x708090; // Slate Gray
    case 'light rain':
      return 0x4682B4; // Steel Blue
    case 'heavy rain':
      return 0x4169E1; // Royal Blue
    case 'thunderstorm':
      return 0x483D8B; // Dark Slate Blue
    case 'snow':
      return 0xF0F8FF; // Alice Blue
    case 'fog':
      return 0xD3D3D3; // Light Gray
    default:
      return 0x7289DA; // Discord Blue
  }
}
