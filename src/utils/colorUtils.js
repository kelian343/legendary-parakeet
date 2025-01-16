// src/utils/colorUtils.js
export function generateColorFromText(text, isDarkMode = false) {
    // Generate a deterministic hash from the text
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert hash to RGB with controlled brightness
    const brightness = isDarkMode ? 0.8 : 0.3; // Adjust for dark/light mode
    const hue = Math.abs(hash) % 360;
    const saturation = 70 + (Math.abs(hash >> 8) % 30); // 70-100%
    
    return `hsla(${hue}, ${saturation}%, ${brightness * 100}%, 0.3)`;
  }