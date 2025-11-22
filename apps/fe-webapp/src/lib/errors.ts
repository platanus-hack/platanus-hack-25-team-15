// Sistema de manejo de errores centralizado
// NO STATIC FALLBACKS - Los errores deben ser manejados explícitamente

export class NoteServiceError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'NoteServiceError';
  }
}

export const ERROR_CODES = {
  FETCH_FAILED: 'FETCH_FAILED',
  CREATE_FAILED: 'CREATE_FAILED',
  UPDATE_FAILED: 'UPDATE_FAILED',
  DELETE_FAILED: 'DELETE_FAILED',
  SEARCH_FAILED: 'SEARCH_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_DATA: 'INVALID_DATA',
} as const;

