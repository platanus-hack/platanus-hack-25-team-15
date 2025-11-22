// Configuración centralizada de la aplicación
// NO STATIC FALLBACKS, NO HARDCODED VALUES, NO MAGIC NUMBERS

export const APP_CONFIG = {
  // UI Limits
  RECENT_NOTES_LIMIT: 10,
  DASHBOARD_RECENT_NOTES_LIMIT: 5,
  MAX_TAGS_DISPLAY: 3,
  
  // Graph View
  GRAPH_RADIUS: 200,
  GRAPH_CENTER_X: 400,
  GRAPH_CENTER_Y: 300,
  GRAPH_VIEWBOX_WIDTH: 800,
  GRAPH_VIEWBOX_HEIGHT: 600,
  GRAPH_NODE_RADIUS: 20,
  GRAPH_NODE_HOVER_RADIUS: 24,
  GRAPH_TEXT_OFFSET_Y: 35,
  GRAPH_TITLE_MAX_LENGTH: 15,
  
  // D3 Force Simulation
  FORCE_CHARGE_STRENGTH: -300,
  FORCE_LINK_DISTANCE: 100,
  FORCE_LINK_STRENGTH: 0.5,
  FORCE_CENTER_X: 0.5,
  FORCE_CENTER_Y: 0.5,
  FORCE_COLLISION_RADIUS: 25,
  FORCE_ALPHA_DECAY: 0.02,
  FORCE_VELOCITY_DECAY: 0.4,
  
  // Zoom & Pan
  ZOOM_MIN_SCALE: 0.1,
  ZOOM_MAX_SCALE: 4,
  ZOOM_INITIAL_SCALE: 0.6,
  ZOOM_STEP: 0.2,
  ZOOM_WHEEL_SENSITIVITY: 0.1,
  
  // Editor
  AUTO_SAVE_DELAY_MS: 2000,
  
  // Locale
  DEFAULT_LOCALE: 'es-ES',
  
  // Defaults
  DEFAULT_PILLAR: 'career' as const,
} as const;

export const UI_MESSAGES = {
  NO_NOTES: 'No hay notas aún. Crea tu primera nota para comenzar.',
  NO_RECENT_NOTES: 'No hay notas recientes',
  NO_CONTENT: '*No hay contenido*',
  SELECT_OR_CREATE_NOTE: 'Selecciona una nota o crea una nueva para comenzar',
  NO_GRAPH_DATA: 'Crea algunas notas para ver el grafo de conexiones',
  NEW_NOTE_TITLE: 'Nueva Nota',
  SAVING: 'Guardando...',
  SEARCH_PLACEHOLDER: 'Buscar notas...',
  NOTE_TITLE_PLACEHOLDER: 'Título de la nota...',
  NOTE_CONTENT_PLACEHOLDER: 'Escribe tu nota en Markdown...',
  TAG_PLACEHOLDER: 'Agregar etiqueta...',
  NEW_VOICE_NOTE_TITLE: 'Nota de Voz',
  RECORDING: 'Grabando...',
  AUDIO_RECORDED: 'Audio grabado',
  PRESS_TO_START: 'Presiona el botón para comenzar',
} as const;

export const PILLAR_COLORS = {
  career: 'fill-blue-500 dark:fill-blue-400',
  social: 'fill-green-500 dark:fill-green-400',
  hobby: 'fill-purple-500 dark:fill-purple-400',
  default: 'fill-gray-500 dark:fill-gray-400',
} as const;

// Colores para SVG con mejor contraste en dark mode
export const PILLAR_COLORS_SVG = {
  career: { light: '#3b82f6', dark: '#60a5fa' }, // blue-500, blue-400
  social: { light: '#22c55e', dark: '#4ade80' }, // green-500, green-400
  hobby: { light: '#a855f7', dark: '#c084fc' }, // purple-500, purple-400
  default: { light: '#6b7280', dark: '#9ca3af' }, // gray-500, gray-400
} as const;

