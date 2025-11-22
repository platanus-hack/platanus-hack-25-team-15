import { create } from 'zustand';
import type { Note } from '@/types/note';
import { updateNote as updateNoteService } from '@/services/noteService';

interface NoteStore {
  // Notes state
  notes: Note[];
  currentNote: Note | null;
  
  // UI state
  searchQuery: string;
  selectedPillar: 'career' | 'social' | 'hobby' | 'all';
  viewMode: 'dashboard' | 'graph' | 'note';
  showFavoritesOnly: boolean;
  
  // Editor state
  editorTitle: string;
  editorContent: string;
  editorTags: string[];
  editorTagInput: string;
  editorViewMode: 'edit' | 'preview';
  editorHasChanges: boolean;
  
  // Actions - Notes
  setNotes: (notes: Note[]) => void;
  setCurrentNote: (note: Note | null) => void;
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  
  // Actions - UI
  setSearchQuery: (query: string) => void;
  setSelectedPillar: (pillar: 'career' | 'social' | 'hobby' | 'all') => void;
  setViewMode: (mode: 'dashboard' | 'graph' | 'note') => void;
  setShowFavoritesOnly: (show: boolean) => void;
  toggleNoteFavorite: (id: string) => void;
  
  // Actions - Editor
  setEditorTitle: (title: string) => void;
  setEditorContent: (content: string) => void;
  setEditorTags: (tags: string[]) => void;
  setEditorTagInput: (input: string) => void;
  setEditorViewMode: (mode: 'edit' | 'preview') => void;
  setEditorHasChanges: (hasChanges: boolean) => void;
  addEditorTag: (tag: string) => void;
  removeEditorTag: (tag: string) => void;
  resetEditor: () => void;
  syncEditorWithCurrentNote: () => void;
  
  // Computed
  getFilteredNotes: () => Note[];
  getFavoriteNotes: () => Note[];
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  // Initial state
  notes: [],
  currentNote: null,
  searchQuery: '',
  selectedPillar: 'all',
  viewMode: 'dashboard',
  showFavoritesOnly: false,
  editorTitle: '',
  editorContent: '',
  editorTags: [],
  editorTagInput: '',
  editorViewMode: 'edit',
  editorHasChanges: false,

  // Notes actions
  setNotes: (notes) => set({ notes }),
  
  setCurrentNote: (note) => {
    set({ currentNote: note });
    // Sincronizar editor con la nota actual
    if (note) {
      set({
        editorTitle: note.title,
        editorContent: note.content,
        editorTags: note.tags,
        editorHasChanges: false,
      });
    } else {
      get().resetEditor();
    }
  },
  
  addNote: (note) => set((state) => ({ notes: [...state.notes, note] })),
  
  updateNote: (id, updates) =>
    set((state) => {
      const updatedNotes = state.notes.map((note) =>
        note.id === id ? { ...note, ...updates, updatedAt: new Date().toISOString() } : note,
      );
      const updatedCurrentNote =
        state.currentNote?.id === id
          ? { ...state.currentNote, ...updates, updatedAt: new Date().toISOString() }
          : state.currentNote;
      
      // Si estamos editando esta nota, sincronizar el editor
      if (state.currentNote?.id === id && updates.title !== undefined) {
        set({ editorTitle: updates.title });
      }
      if (state.currentNote?.id === id && updates.content !== undefined) {
        set({ editorContent: updates.content });
      }
      if (state.currentNote?.id === id && updates.tags !== undefined) {
        set({ editorTags: updates.tags });
      }
      if (state.currentNote?.id === id) {
        set({ editorHasChanges: false });
      }
      
      // Persistir cambios en el backend de forma asíncrona
      updateNoteService(id, updates).catch((error) => {
        console.error('Error updating note in backend:', error);
      });
      
      return {
        notes: updatedNotes,
        currentNote: updatedCurrentNote,
      };
    }),
  
  deleteNote: (id) =>
    set((state) => ({
      notes: state.notes.filter((note) => note.id !== id),
      currentNote: state.currentNote?.id === id ? null : state.currentNote,
    })),

  // UI actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedPillar: (pillar) => set({ selectedPillar: pillar }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setShowFavoritesOnly: (show) => set({ showFavoritesOnly: show }),
  
  toggleNoteFavorite: (id) => {
    const { notes } = get();
    const note = notes.find((n) => n.id === id);
    if (note) {
      get().updateNote(id, { isFavorite: !note.isFavorite });
    }
  },

  // Editor actions
  setEditorTitle: (title) => {
    set({ editorTitle: title, editorHasChanges: true });
  },
  
  setEditorContent: (content) => {
    set({ editorContent: content, editorHasChanges: true });
  },
  
  setEditorTags: (tags) => {
    set({ editorTags: tags, editorHasChanges: true });
  },
  
  setEditorTagInput: (input) => set({ editorTagInput: input }),
  
  setEditorViewMode: (mode) => set({ editorViewMode: mode }),
  
  setEditorHasChanges: (hasChanges) => set({ editorHasChanges: hasChanges }),
  
  addEditorTag: (tag) => {
    const { editorTags } = get();
    if (tag.trim() && !editorTags.includes(tag.trim())) {
      set({
        editorTags: [...editorTags, tag.trim()],
        editorTagInput: '',
        editorHasChanges: true,
      });
    }
  },
  
  removeEditorTag: (tagToRemove) => {
    const { editorTags } = get();
    set({
      editorTags: editorTags.filter((tag) => tag !== tagToRemove),
      editorHasChanges: true,
    });
  },
  
  resetEditor: () => {
    set({
      editorTitle: '',
      editorContent: '',
      editorTags: [],
      editorTagInput: '',
      editorViewMode: 'edit',
      editorHasChanges: false,
    });
  },
  
  syncEditorWithCurrentNote: () => {
    const { currentNote } = get();
    if (currentNote) {
      set({
        editorTitle: currentNote.title,
        editorContent: currentNote.content,
        editorTags: currentNote.tags,
        editorHasChanges: false,
      });
    }
  },

  // Computed
  getFilteredNotes: () => {
    const { notes, searchQuery, selectedPillar, showFavoritesOnly } = get();
    return notes.filter((note) => {
      const matchesSearch =
        searchQuery === '' ||
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      const matchesPillar =
        selectedPillar === 'all' || note.pillar === selectedPillar;
      const matchesFavorites = !showFavoritesOnly || note.isFavorite;
      return matchesSearch && matchesPillar && matchesFavorites;
    });
  },
  
  getFavoriteNotes: () => {
    const { notes } = get();
    return notes.filter((note) => note.isFavorite);
  },
}));

