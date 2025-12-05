/**
 * Color Contrast Calculator
 * Calculates WCAG contrast ratios between foreground and background colors
 */

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate relative luminance
 * https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
 */
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * Returns ratio (e.g., 4.5 for WCAG AA)
 */
export function calculateContrast(color1, color2) {
  let rgb1, rgb2;

  // Parse color1
  if (color1.startsWith('#')) {
    rgb1 = hexToRgb(color1);
  } else if (color1.startsWith('rgb')) {
    const match = color1.match(/\d+/g);
    if (match && match.length >= 3) {
      rgb1 = { r: parseInt(match[0]), g: parseInt(match[1]), b: parseInt(match[2]) };
    }
  }
  
  // Parse color2
  if (color2.startsWith('#')) {
    rgb2 = hexToRgb(color2);
  } else if (color2.startsWith('rgb')) {
    const match = color2.match(/\d+/g);
    if (match && match.length >= 3) {
      rgb2 = { r: parseInt(match[0]), g: parseInt(match[1]), b: parseInt(match[2]) };
    }
  }

  if (!rgb1 || !rgb2) {
    return null;
  }

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG AA standards
 * - Normal text: 4.5:1
 * - Large text (18pt+ or 14pt+ bold): 3:1
 * - UI components: 3:1
 */
export function meetsWCAGAA(contrast, isLargeText = false, isUIComponent = false) {
  if (!contrast) return null;
  
  if (isUIComponent) {
    return contrast >= 3.0;
  }
  
  if (isLargeText) {
    return contrast >= 3.0;
  }
  
  return contrast >= 4.5;
}

/**
 * Extract color values from CSS
 */
export function extractColorValues(cssContent) {
  const colors = [];
  
  // Match color and background-color declarations
  const colorRegex = /(color|background-color|background)\s*:\s*([^;]+)/gi;
  let match;
  
  while ((match = colorRegex.exec(cssContent)) !== null) {
    const property = match[1].toLowerCase();
    const value = match[2].trim();
    
    // Extract hex colors
    const hexMatch = value.match(/#[0-9a-fA-F]{3,6}/);
    if (hexMatch) {
      colors.push({
        property,
        value: hexMatch[0],
        fullValue: value,
        line: cssContent.substring(0, match.index).split('\n').length
      });
    }
    
    // Extract rgb colors
    const rgbMatch = value.match(/rgba?\([^)]+\)/);
    if (rgbMatch) {
      colors.push({
        property,
        value: rgbMatch[0],
        fullValue: value,
        line: cssContent.substring(0, match.index).split('\n').length
      });
    }
  }
  
  return colors;
}
