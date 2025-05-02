const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('color')
    .setDescription('View and visualize a color')
    .addStringOption(option =>
      option.setName('hex')
        .setDescription('Hex color code (e.g. #FF5733 or FF5733)')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('red')
        .setDescription('Red component (0-255)')
        .setMinValue(0)
        .setMaxValue(255)
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('green')
        .setDescription('Green component (0-255)')
        .setMinValue(0)
        .setMaxValue(255)
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('blue')
        .setDescription('Blue component (0-255)')
        .setMinValue(0)
        .setMaxValue(255)
        .setRequired(false))
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Color name (e.g. red, blue, coral)')
        .setRequired(false)),
  
  cooldown: 5,
  
  // Named colors map
  namedColors: {
    'black': '#000000',
    'white': '#FFFFFF',
    'red': '#FF0000',
    'green': '#00FF00',
    'blue': '#0000FF',
    'yellow': '#FFFF00',
    'cyan': '#00FFFF',
    'magenta': '#FF00FF',
    'silver': '#C0C0C0',
    'gray': '#808080',
    'maroon': '#800000',
    'olive': '#808000',
    'navy': '#000080',
    'purple': '#800080',
    'teal': '#008080',
    'lime': '#00FF00',
    'aqua': '#00FFFF',
    'fuchsia': '#FF00FF',
    'coral': '#FF7F50',
    'tomato': '#FF6347',
    'orange': '#FFA500',
    'gold': '#FFD700',
    'salmon': '#FA8072',
    'pink': '#FFC0CB',
    'lavender': '#E6E6FA',
    'skyblue': '#87CEEB',
    'violet': '#EE82EE',
    'brown': '#A52A2A',
    'tan': '#D2B48C',
    'beige': '#F5F5DC',
    'mint': '#98FB98',
    'turquoise': '#40E0D0',
    'indigo': '#4B0082',
    'blurple': '#5865F2', // Discord Blurple
    'greyple': '#99AAB5', // Discord Greyple
    'dark': '#36393F', // Discord Dark Theme
    'success': '#57F287', // Discord Green
    'danger': '#ED4245', // Discord Red
    'warning': '#FEE75C' // Discord Yellow
  },
  
  /**
   * Executes the color command
   * @param {Interaction} interaction - The interaction
   */
  async execute(interaction) {
    // Get options from the command
    const hexCode = interaction.options.getString('hex');
    const red = interaction.options.getInteger('red');
    const green = interaction.options.getInteger('green');
    const blue = interaction.options.getInteger('blue');
    const colorName = interaction.options.getString('name')?.toLowerCase();
    
    // Determine which input method was used
    let color = null;
    let inputMethod = '';
    
    // Priority: RGB > Hex > Name > Random
    if (red !== null && green !== null && blue !== null) {
      color = this.rgbToHex(red, green, blue);
      inputMethod = 'RGB';
    } else if (hexCode) {
      color = this.validateHex(hexCode);
      inputMethod = 'Hex';
    } else if (colorName && this.namedColors[colorName]) {
      color = this.namedColors[colorName];
      inputMethod = 'Name';
    } else {
      // Generate a random color
      color = this.getRandomColor();
      inputMethod = 'Random';
    }
    
    // Validate color
    if (!color) {
      return interaction.reply({
        content: 'Invalid color format! Please provide a valid hex color (e.g. #FF5733) or RGB values.',
        ephemeral: true
      });
    }
    
    // Get the hex without # for Discord's integer format
    const hex = color.replace('#', '');
    const colorInt = parseInt(hex, 16);
    
    // Calculate complementary color (for text contrast)
    const complementary = this.getComplementaryColor(color);
    
    // Convert the color to RGB
    const rgb = this.hexToRgb(color);
    if (!rgb) {
      return interaction.reply({
        content: 'Could not parse the color. Please provide a valid color format.',
        ephemeral: true
      });
    }
    
    // Convert to other color formats
    const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
    const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);
    const cmyk = this.rgbToCmyk(rgb.r, rgb.g, rgb.b);
    
    // Create the embed
    const embed = new EmbedBuilder()
      .setTitle(`Color Information: ${color.toUpperCase()}`)
      .setColor(colorInt) // Set the embed color to the selected color
      .setDescription(`Here's a visualization of the color ${color.toUpperCase()}`)
      .addFields(
        { name: 'Input Method', value: inputMethod, inline: true },
        { name: 'Hex', value: color.toUpperCase(), inline: true },
        { name: 'RGB', value: `${rgb.r}, ${rgb.g}, ${rgb.b}`, inline: true },
        { name: 'HSL', value: `${Math.round(hsl.h)}°, ${Math.round(hsl.s * 100)}%, ${Math.round(hsl.l * 100)}%`, inline: true },
        { name: 'HSV', value: `${Math.round(hsv.h)}°, ${Math.round(hsv.s * 100)}%, ${Math.round(hsv.v * 100)}%`, inline: true },
        { name: 'CMYK', value: `${Math.round(cmyk.c * 100)}%, ${Math.round(cmyk.m * 100)}%, ${Math.round(cmyk.y * 100)}%, ${Math.round(cmyk.k * 100)}%`, inline: true },
        { name: 'Complementary', value: complementary.toUpperCase(), inline: true },
        { name: 'Closest Named Color', value: this.findClosestNamedColor(rgb), inline: true }
      )
      .setThumbnail(`https://singlecolorimage.com/get/${hex}/400x200`)
      .setFooter({ text: 'Use /color without parameters for a random color' })
      .setTimestamp();
      
    // Generate a larger color swatch in the embed description
    let colorSwatch = '';
    for (let i = 0; i < 8; i++) {
      colorSwatch += '\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\n';
    }
    embed.setDescription(colorSwatch);
    
    await interaction.reply({ embeds: [embed] });
    
    logger.info(`User ${interaction.user.tag} used color command for color: ${color}`);
  },
  
  /**
   * Validates a hex color code
   * @param {string} hex - The hex code to validate
   * @returns {string|null} - Valid hex code or null
   */
  validateHex(hex) {
    // Add # if it doesn't exist
    if (hex.charAt(0) !== '#') {
      hex = '#' + hex;
    }
    
    // Check if it's a valid hex color
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexRegex.test(hex)) {
      return null;
    }
    
    // Convert shorthand (e.g. #ABC) to full form (e.g. #AABBCC)
    if (hex.length === 4) {
      hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    
    return hex;
  },
  
  /**
   * Converts RGB values to a hex color code
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @returns {string} - Hex color code
   */
  rgbToHex(r, g, b) {
    return '#' + [
      r.toString(16).padStart(2, '0'),
      g.toString(16).padStart(2, '0'),
      b.toString(16).padStart(2, '0')
    ].join('').toUpperCase();
  },
  
  /**
   * Converts a hex color code to RGB values
   * @param {string} hex - The hex color code
   * @returns {Object|null} - RGB object or null
   */
  hexToRgb(hex) {
    // Remove the # if it exists
    hex = hex.replace('#', '');
    
    // Parse the hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Check if the parsed values are valid
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return null;
    }
    
    return { r, g, b };
  },
  
  /**
   * Converts RGB values to HSL values
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @returns {Object} - HSL object (h: 0-360, s: 0-1, l: 0-1)
   */
  rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    return { h: h * 360, s, l };
  },
  
  /**
   * Converts RGB values to HSV values
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @returns {Object} - HSV object (h: 0-360, s: 0-1, v: 0-1)
   */
  rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, v = max;
    
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    
    if (max === min) {
      h = 0; // achromatic
    } else {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    return { h: h * 360, s, v };
  },
  
  /**
   * Converts RGB values to CMYK values
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @returns {Object} - CMYK object (c, m, y, k: 0-1)
   */
  rgbToCmyk(r, g, b) {
    // Normalize RGB to 0-1
    r = r / 255;
    g = g / 255;
    b = b / 255;
    
    // Calculate K (black)
    const k = 1 - Math.max(r, g, b);
    
    // Guard against division by zero
    if (k === 1) {
      return { c: 0, m: 0, y: 0, k: 1 };
    }
    
    // Calculate CMY
    const c = (1 - r - k) / (1 - k);
    const m = (1 - g - k) / (1 - k);
    const y = (1 - b - k) / (1 - k);
    
    return { c, m, y, k };
  },
  
  /**
   * Generates a complementary color (opposite on the color wheel)
   * @param {string} hex - The hex color code
   * @returns {string} - Complementary hex color code
   */
  getComplementaryColor(hex) {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return '#FFFFFF';
    
    // Convert to HSL, shift hue by 180 degrees, convert back to hex
    const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
    hsl.h = (hsl.h + 180) % 360;
    
    // Convert HSL back to RGB
    const h = hsl.h / 360;
    const s = hsl.s;
    const l = hsl.l;
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    return this.rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
  },
  
  /**
   * Generates a random color
   * @returns {string} - Random hex color code
   */
  getRandomColor() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    
    return this.rgbToHex(r, g, b);
  },
  
  /**
   * Calculate the distance between two colors in RGB space
   * @param {Object} rgb1 - First RGB color
   * @param {Object} rgb2 - Second RGB color
   * @returns {number} - Distance between colors
   */
  colorDistance(rgb1, rgb2) {
    return Math.sqrt(
      Math.pow(rgb2.r - rgb1.r, 2) +
      Math.pow(rgb2.g - rgb1.g, 2) +
      Math.pow(rgb2.b - rgb1.b, 2)
    );
  },
  
  /**
   * Find the closest named color to a given RGB color
   * @param {Object} rgb - RGB color
   * @returns {string} - Name of the closest color
   */
  findClosestNamedColor(rgb) {
    let closestColor = '';
    let closestDistance = Infinity;
    
    for (const [name, hex] of Object.entries(this.namedColors)) {
      const namedRgb = this.hexToRgb(hex);
      const distance = this.colorDistance(rgb, namedRgb);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestColor = name;
      }
    }
    
    return closestColor.charAt(0).toUpperCase() + closestColor.slice(1);
  }
};