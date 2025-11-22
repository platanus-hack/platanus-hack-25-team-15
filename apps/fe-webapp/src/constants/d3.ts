// Constantes específicas de D3.js y simulaciones de fuerza
// NO STATIC FALLBACKS, NO HARDCODED VALUES, NO MAGIC NUMBERS

export const D3_SIMULATION = {
  // Alpha targets
  ALPHA_TARGET_ACTIVE: 0.3,
  ALPHA_TARGET_INACTIVE: 0,
  
  // Center force strength
  CENTER_FORCE_STRENGTH: 0.1,
  
  // Stroke width
  LINK_STROKE_WIDTH: 1,
  
  // Default positions (fallback)
  DEFAULT_X: 0,
  DEFAULT_Y: 0,
  
  // Math constants
  FULL_CIRCLE_RADIANS: Math.PI * 2,
  
  // Event filters
  MOUSE_BUTTON_LEFT: 0,
} as const;

export const D3_ZOOM = {
  // Transform calculations
  CENTER_TRANSLATE_FACTOR: 0.5, // width / 2, height / 2
} as const;

