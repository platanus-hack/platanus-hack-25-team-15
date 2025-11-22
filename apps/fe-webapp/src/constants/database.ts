// Constantes de base de datos: nombres de tablas, campos, etc.
// NO STATIC FALLBACKS, NO HARDCODED VALUES, NO MAGIC NUMBERS

export const DB_TABLES = {
  NOTES: 'notes',
} as const;

export const DB_FIELDS = {
  // Campos de la tabla notes
  ID: 'id',
  TITLE: 'title',
  CONTENT: 'content',
  TAGS: 'tags',
  PILLAR: 'pillar',
  IS_FAVORITE: 'is_favorite',
  LINKED_NOTES: 'linked_notes',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
} as const;

export const DB_ORDER = {
  UPDATED_AT_DESC: { ascending: false },
  UPDATED_AT_ASC: { ascending: true },
} as const;

