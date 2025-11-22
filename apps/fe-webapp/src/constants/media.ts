// Constantes de media: audio, video, grabación
// NO STATIC FALLBACKS, NO HARDCODED VALUES, NO MAGIC NUMBERS

export const MEDIA_RECORDING = {
  // Intervalo de actualización de duración (ms)
  DURATION_UPDATE_INTERVAL: 1000,
  
  // Tipo de audio
  AUDIO_MIME_TYPE: 'audio/webm',
  
  // Configuración de MediaRecorder
  AUDIO_CONSTRAINTS: { audio: true } as MediaStreamConstraints,
} as const;

export const MEDIA_PLAYBACK = {
  // Tamaño mínimo de datos para considerar válido
  MIN_DATA_SIZE: 0,
} as const;

