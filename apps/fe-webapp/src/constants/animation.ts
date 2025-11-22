// Constantes de animación y timing
// NO STATIC FALLBACKS, NO HARDCODED VALUES, NO MAGIC NUMBERS

export const ANIMATION_DURATION = {
  // Transiciones generales
  FAST: 200, // ms
  NORMAL: 300, // ms
  SLOW: 500, // ms
  
  // Zoom transitions
  ZOOM_RESET: 300, // ms
  ZOOM_STEP: 200, // ms
  
  // FAB animation
  FAB_SLIDE_IN: 200, // duration-200
} as const;

export const ANIMATION_DELAY = {
  TOOLTIP: 0, // delayDuration={0}
} as const;

