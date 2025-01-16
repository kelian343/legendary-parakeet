// src/utils/colorUtils.js

// Grid size for Lab color space division (10x10x10 = 1000 regions)
const GRID_SIZE = 10;
const colorGrid = new Array(GRID_SIZE).fill(0).map(() => 
  new Array(GRID_SIZE).fill(0).map(() => 
    new Array(GRID_SIZE).fill(0)
  )
);

// Track used colors in Lab space
const usedLabColors = new Set();

// Convert RGB to XYZ
function rgbToXyz(r, g, b) {
  r = r / 255;
  g = g / 255;
  b = b / 255;

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = r * 0.0193 + g * 0.1192 + b * 0.9505;

  return [x * 100, y * 100, z * 100];
}

// Convert XYZ to Lab
function xyzToLab(x, y, z) {
  const xn = 95.047;
  const yn = 100.000;
  const zn = 108.883;

  x = x / xn;
  y = y / yn;
  z = z / zn;

  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

  const L = (116 * y) - 16;
  const a = 500 * (x - y);
  const b = 200 * (y - z);

  return [L, a, b];
}

// Convert Lab to XYZ
function labToXyz(L, a, b) {
  let y = (L + 16) / 116;
  let x = a / 500 + y;
  let z = y - b / 200;

  const yn = 100.0;
  const xn = 95.047;
  const zn = 108.883;

  const y3 = Math.pow(y, 3);
  const x3 = Math.pow(x, 3);
  const z3 = Math.pow(z, 3);

  y = y3 > 0.008856 ? y3 : (y - 16/116) / 7.787;
  x = x3 > 0.008856 ? x3 : (x - 16/116) / 7.787;
  z = z3 > 0.008856 ? z3 : (z - 16/116) / 7.787;

  return [x * xn, y * yn, z * zn];
}

// Convert XYZ to RGB
function xyzToRgb(x, y, z) {
  x = x / 100;
  y = y / 100;
  z = z / 100;

  let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let b = x * 0.0557 + y * -0.2040 + z * 1.0570;

  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1/2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1/2.4) - 0.055 : 12.92 * g;
  b = b > 0.0031308 ? 1.055 * Math.pow(b, 1/2.4) - 0.055 : 12.92 * b;

  r = Math.min(Math.max(0, r), 1);
  g = Math.min(Math.max(0, g), 1);
  b = Math.min(Math.max(0, b), 1);

  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255)
  ];
}

// Calculate ΔE94
function calculateDeltaE94(lab1, lab2) {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;

  const dL = L1 - L2;
  const da = a1 - a2;
  const db = b1 - b2;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const dC = C1 - C2;
  const dH = Math.sqrt(Math.max(0, da * da + db * db - dC * dC));

  const sL = 1;
  const kL = 1;
  const k1 = 0.045;
  const k2 = 0.015;

  const sC = 1 + k1 * C1;
  const sH = 1 + k2 * C1;

  return Math.sqrt(
    Math.pow(dL / (kL * sL), 2) +
    Math.pow(dC / sC, 2) +
    Math.pow(dH / sH, 2)
  );
}

// Get grid coordinates for a Lab color
function getGridCoordinates(L, a, b) {
  // Map L from [0,100] to [0,GRID_SIZE-1]
  // Map a,b from [-128,127] to [0,GRID_SIZE-1]
  const Li = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(L / 100 * GRID_SIZE)));
  const ai = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((a + 128) / 256 * GRID_SIZE)));
  const bi = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((b + 128) / 256 * GRID_SIZE)));
  return [Li, ai, bi];
}

// Find region with lowest color density
function findLeastPopulatedRegion() {
  let minCount = Infinity;
  let targetRegions = [];

  // Find minimum count
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      for (let k = 0; k < GRID_SIZE; k++) {
        const count = colorGrid[i][j][k];
        if (count < minCount) {
          minCount = count;
          targetRegions = [[i, j, k]];
        } else if (count === minCount) {
          targetRegions.push([i, j, k]);
        }
      }
    }
  }

  // Randomly select from regions with minimum count
  return targetRegions[Math.floor(Math.random() * targetRegions.length)];
}

// Generate color from grid region
function generateColorFromRegion(region, isDarkMode) {
  const [Li, ai, bi] = region;
  
  // Convert grid coordinates back to Lab values
  const L = (Li + Math.random()) * 100 / GRID_SIZE;
  const a = ((ai + Math.random()) * 256 / GRID_SIZE) - 128;
  const b = ((bi + Math.random()) * 256 / GRID_SIZE) - 128;

  // Convert to RGB
  const xyz = labToXyz(L, a, b);
  const [r, g, b_] = xyzToRgb(...xyz);

  // Adjust opacity based on theme
  const opacity = isDarkMode ? 0.4 : 0.35;

  return {
    lab: [L, a, b],
    rgb: [r, g, b_],
    css: `rgba(${r}, ${g}, ${b_}, ${opacity})`
  };
}

export function generateColorFromText(text, isDarkMode = false) {
  // Find least populated region
  const region = findLeastPopulatedRegion();
  
  // Generate and validate color
  let color;
  let attempts = 0;
  const maxAttempts = 50;

  do {
    color = generateColorFromRegion(region, isDarkMode);
    attempts++;

    // Check if this exact color already exists
    const colorExists = Array.from(usedLabColors).some(existingColor => 
      calculateDeltaE94(existingColor, color.lab) < 1
    );

    if (!colorExists) {
      // Update grid and tracking
      colorGrid[region[0]][region[1]][region[2]]++;
      usedLabColors.add(color.lab);
      return color.css;
    }
  } while (attempts < maxAttempts);

  // Fallback: Return a slightly modified version of the color
  color = generateColorFromRegion(region, isDarkMode);
  colorGrid[region[0]][region[1]][region[2]]++;
  usedLabColors.add(color.lab);
  return color.css;
}

export function clearUsedColors() {
  usedLabColors.clear();
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      for (let k = 0; k < GRID_SIZE; k++) {
        colorGrid[i][j][k] = 0;
      }
    }
  }
}