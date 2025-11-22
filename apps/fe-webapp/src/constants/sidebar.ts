// Constantes específicas del sidebar
// NO STATIC FALLBACKS, NO HARDCODED VALUES, NO MAGIC NUMBERS

export const SIDEBAR_CONFIG = {
  COOKIE_NAME: 'sidebar_state',
  COOKIE_MAX_AGE_SECONDS: 60 * 60 * 24 * 7, // 7 días
} as const;

