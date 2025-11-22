import { useEffect, useState } from 'react';
import { useNoteStore } from '@/stores/noteStore';
import { fetchNotes } from '@/services/noteService';
import { NoteServiceError } from '@/lib/errors';

export function useNotes() {
  const { setNotes, notes } = useNoteStore();
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadNotes = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const fetchedNotes = await fetchNotes();
        setNotes(fetchedNotes);
      } catch (err) {
        const noteError = err instanceof NoteServiceError 
          ? err 
          : new NoteServiceError('Failed to load notes', 'FETCH_FAILED');
        setError(noteError);
        console.error('Error loading notes:', noteError);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotes();
  }, [setNotes]);

  return {
    notes,
    isLoading,
    error,
  };
}

