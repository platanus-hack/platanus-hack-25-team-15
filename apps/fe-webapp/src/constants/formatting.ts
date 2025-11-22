// Constantes de formato: fechas, duraciones, números
// NO STATIC FALLBACKS, NO HARDCODED VALUES, NO MAGIC NUMBERS

export const FORMATTING = {
  // Formato de duración
  DURATION_MINUTES_PER_HOUR: 60,
  DURATION_SECONDS_PER_MINUTE: 60,
  DURATION_PAD_START: 2,
  
  // Formato de fecha
  DATE_LOCALE: 'es-ES',
  DATE_OPTIONS_DAY_MONTH: {
    day: 'numeric' as const,
    month: 'short' as const,
  },
  
  // Formato de archivo
  FILE_NAME_REPLACE_PATTERN: /\s+/g,
  FILE_NAME_REPLACE_WITH: '-',
} as const;

