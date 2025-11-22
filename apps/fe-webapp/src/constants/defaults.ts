// Valores por defecto y constantes de datos
// NO STATIC FALLBACKS, NO HARDCODED VALUES, NO MAGIC NUMBERS

export const DEFAULT_TAGS = {
  VOICE_NOTE: ['voz', 'audio'],
} as const;

export const DEFAULT_VALUES = {
  // Valores por defecto para notas
  EMPTY_CONTENT: '',
  EMPTY_TAGS: [],
  EMPTY_LINKED_NOTES: [],
  DEFAULT_IS_FAVORITE: false,
  
  // Valores por defecto para audio
  AUDIO_TYPE: 'audio/webm',
  AUDIO_MIME_TYPE: 'audio/webm',
  
  // Valores por defecto para markdown
  MARKDOWN_FILE_TYPE: 'text/markdown',
  MARKDOWN_FILE_EXTENSION: '.md',
} as const;

export const DEFAULT_MESSAGES = {
  AUDIO_NOT_SUPPORTED: 'Tu navegador no soporta el elemento de audio.',
} as const;

