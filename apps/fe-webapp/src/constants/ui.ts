// Constantes de UI: dimensiones, spacing, posiciones, z-index
// NO STATIC FALLBACKS, NO HARDCODED VALUES, NO MAGIC NUMBERS

export const UI_DIMENSIONS = {
  // Header
  HEADER_HEIGHT: 16, // h-16
  
  // Floating Action Button
  FAB_BOTTOM: 6, // bottom-6
  FAB_RIGHT: 6, // right-6
  FAB_SIZE: 14, // h-14 w-14
  FAB_Z_INDEX: 100, // z-[100]
  FAB_MENU_MIN_WIDTH: 200, // min-w-[200px]
  
  // Icons
  ICON_SIZE_SM: 3, // h-3 w-3
  ICON_SIZE_MD: 4, // h-4 w-4
  ICON_SIZE_LG: 5, // h-5 w-5
  ICON_SIZE_XL: 6, // h-6 w-6
  ICON_SIZE_XXL: 8, // h-8 w-8
  
  // Graph View
  GRAPH_LEGEND_BOTTOM: 4, // bottom-4
  GRAPH_LEGEND_LEFT: 4, // left-4
  GRAPH_NODE_LIST_RIGHT: 4, // right-4
  GRAPH_NODE_LIST_TOP: 4, // top-4
  GRAPH_NODE_LIST_MAX_HEIGHT: 96, // max-h-96
  GRAPH_NODE_LIST_WIDTH: 64, // w-64
  
  // Voice Recorder
  VOICE_RECORDER_INSET: 4, // inset-4
  VOICE_RECORDER_BUTTON_SIZE: 16, // h-16 w-16
  VOICE_RECORDER_CONTROL_BUTTON_SIZE: 12, // h-12 w-12
  
  // Sidebar
  SIDEBAR_ICON_SIZE: 5, // h-5 w-5
  SIDEBAR_BADGE_SIZE: 5, // h-5 w-5
  
  // Dashboard
  DASHBOARD_PADDING: 6, // p-6
  DASHBOARD_GRID_COLS_MD: 2, // md:grid-cols-2
  DASHBOARD_GRID_COLS_LG: 4, // lg:grid-cols-4
  DASHBOARD_PILLARS_COLS_MD: 3, // md:grid-cols-3
  
  // Editor
  EDITOR_TAG_INPUT_HEIGHT: 7, // h-7
  EDITOR_TAG_INPUT_WIDTH: 32, // w-32
  EDITOR_TAG_PADDING_X: 1.5, // px-1.5
  EDITOR_TAG_PADDING_Y: 0.5, // py-0.5
  
  // Spacing
  GAP_1: 1,
  GAP_2: 2,
  GAP_3: 3,
  GAP_4: 4,
} as const;

export const UI_POSITIONS = {
  ABSOLUTE_BOTTOM_4: 'bottom-4',
  ABSOLUTE_LEFT_4: 'left-4',
  ABSOLUTE_RIGHT_4: 'right-4',
  ABSOLUTE_TOP_4: 'top-4',
  ABSOLUTE_BOTTOM_6: 'bottom-6',
  ABSOLUTE_RIGHT_6: 'right-6',
} as const;

export const UI_Z_INDEX = {
  FAB: 100,
  VOICE_RECORDER: 50,
  HEADER: 10,
} as const;

