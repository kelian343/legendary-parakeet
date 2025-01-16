// src/utils/colorUtils.js

// Keep track of used hues globally
const usedHues = new Set();

// Function to find the largest gap in used hues
function findLargestHueGap() {
  if (usedHues.size === 0) return { start: 0, size: 360 };
  
  // Convert set to sorted array
  const sortedHues = Array.from(usedHues).sort((a, b) => a - b);
  
  // Find largest gap between used hues
  let maxGap = 0;
  let gapStart = 0;
  
  // Check gap between last and first (wrapping around 360)
  const wrappingGap = (360 - sortedHues[sortedHues.length - 1]) + sortedHues[0];
  maxGap = wrappingGap;
  gapStart = sortedHues[sortedHues.length - 1];
  
  // Check gaps between consecutive hues
  for (let i = 0; i < sortedHues.length - 1; i++) {
    const gap = sortedHues[i + 1] - sortedHues[i];
    if (gap > maxGap) {
      maxGap = gap;
      gapStart = sortedHues[i];
    }
  }
  
  return { start: gapStart, size: maxGap };
}

export function generateColorFromText(text, isDarkMode = false) {
  // Create deterministic hash from text
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  // Find the largest gap in the color wheel
  const { start, size } = findLargestHueGap();
  
  // Place new hue in middle of largest gap
  let hue = (start + (size / 2)) % 360;
  
  // Add small variation based on text hash to prevent exact same hue
  // for similar texts, but keep it within the gap
  const variation = (hash % 20) - 10; // ±10 degrees
  hue = (hue + variation + 360) % 360;
  
  // Add to used hues
  usedHues.add(hue);

  // Clean up if too many colors (optional)
  if (usedHues.size > 100) {
    // Keep only the most recently used colors
    const recent = Array.from(usedHues).slice(-50);
    usedHues.clear();
    recent.forEach(h => usedHues.add(h));
  }

  // Generate saturation and lightness based on theme
  const saturation = 70 + (hash % 20); // 70-90%
  let lightness, opacity;
  
  if (isDarkMode) {
    lightness = 65 + (hash % 15); // 65-80%
    opacity = 0.4;
  } else {
    lightness = 55 + (hash % 15); // 55-70%
    opacity = 0.35;
  }

  return `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`;
}

// Optional: Add method to clear color history
export function clearUsedColors() {
  usedHues.clear();
}