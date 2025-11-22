// Fuente centralizada de datos mock
// ALL MOCK DATA ARE CENTRALIZED IN ONE SOURCE OF DATA

import type { Note } from '@/types/note';

export const MOCK_NOTES: Note[] = [
  {
    id: 'mock-1',
    title: 'Nota de Ejemplo - Desarrollo de Carrera',
    content: '# Desarrollo Profesional\n\nEsta es una nota de ejemplo sobre desarrollo de carrera.',
    tags: ['desarrollo', 'carrera', 'profesional'],
    pillar: 'career',
    isFavorite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    linkedNotes: [],
  },
  {
    id: 'mock-2',
    title: 'Nota de Ejemplo - Social',
    content: '# Vida Social\n\nEsta es una nota de ejemplo sobre vida social.',
    tags: ['social', 'amigos'],
    pillar: 'social',
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    linkedNotes: [],
  },
  {
    id: 'mock-3',
    title: 'Nota de Ejemplo - Hobby',
    content: '# Mis Hobbies\n\nEsta es una nota de ejemplo sobre hobbies.',
    tags: ['hobby', 'intereses'],
    pillar: 'hobby',
    isFavorite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    linkedNotes: [],
  },
];

export const EMPTY_NOTE: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  content: '',
  tags: [],
  pillar: 'career',
  isFavorite: false,
  linkedNotes: [],
};

