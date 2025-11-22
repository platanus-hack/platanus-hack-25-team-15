import { getSupabaseClient } from '@/lib/supabase';
import type { Note } from '@/types/note';
import { NoteServiceError, ERROR_CODES } from '@/lib/errors';
import { DB_TABLES } from '@/constants';

export async function fetchNotes(): Promise<Note[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(DB_TABLES.NOTES)
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      throw new NoteServiceError(
        `Failed to fetch notes: ${error.message}`,
        ERROR_CODES.FETCH_FAILED,
      );
    }

    if (!data) {
      throw new NoteServiceError(
        'No data returned from database',
        ERROR_CODES.FETCH_FAILED,
      );
    }

    return data.map(mapDbNoteToNote);
  } catch (error) {
    console.error('Error fetching notes:', error);
    throw error;
  }
}

export async function createNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
  try {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    
    const linkedNotes = note.linkedNotes ?? [];
    const isFavorite = note.isFavorite ?? false;
    
    const { data, error } = await supabase
      .from(DB_TABLES.NOTES)
      .insert({
        title: note.title,
        content: note.content,
        tags: note.tags,
        pillar: note.pillar,
        is_favorite: isFavorite,
        linked_notes: linkedNotes,
        created_at: now,
        updated_at: now,
      } as never)
      .select()
      .single();

    if (error) {
      throw new NoteServiceError(
        `Failed to create note: ${error.message}`,
        ERROR_CODES.CREATE_FAILED,
      );
    }

    if (!data) {
      throw new NoteServiceError(
        'No data returned after creating note',
        ERROR_CODES.CREATE_FAILED,
      );
    }

    return mapDbNoteToNote(data);
  } catch (error) {
    console.error('Error creating note:', error);
    throw error;
  }
}

export async function updateNote(id: string, updates: Partial<Note>): Promise<Note> {
  try {
    const supabase = getSupabaseClient();
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.pillar !== undefined) updateData.pillar = updates.pillar;
    if (updates.isFavorite !== undefined) updateData.is_favorite = updates.isFavorite;
    if (updates.linkedNotes !== undefined) {
      updateData.linked_notes = updates.linkedNotes ?? [];
    }

    const { data, error } = await supabase
      .from(DB_TABLES.NOTES)
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new NoteServiceError(
        `Failed to update note: ${error.message}`,
        ERROR_CODES.UPDATE_FAILED,
      );
    }

    if (!data) {
      throw new NoteServiceError(
        `Note with id ${id} not found`,
        ERROR_CODES.NOT_FOUND,
      );
    }

    return mapDbNoteToNote(data);
  } catch (error) {
    console.error('Error updating note:', error);
    throw error;
  }
}

export async function deleteNote(id: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from(NOTES_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting note:', error);
    return false;
  }
}

export async function fetchFavoriteNotes(): Promise<Note[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(DB_TABLES.NOTES)
      .select('*')
      .eq('is_favorite', true)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new NoteServiceError(
        `Failed to fetch favorite notes: ${error.message}`,
        ERROR_CODES.FETCH_FAILED,
      );
    }

    if (!data) {
      throw new NoteServiceError(
        'No data returned from database',
        ERROR_CODES.FETCH_FAILED,
      );
    }

    return data.map(mapDbNoteToNote);
  } catch (error) {
    console.error('Error fetching favorite notes:', error);
    throw error;
  }
}

export async function toggleNoteFavorite(id: string, isFavorite: boolean): Promise<Note> {
  return updateNote(id, { isFavorite });
}

export async function searchNotes(query: string): Promise<Note[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(DB_TABLES.NOTES)
      .select('*')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new NoteServiceError(
        `Failed to search notes: ${error.message}`,
        ERROR_CODES.SEARCH_FAILED,
      );
    }

    if (!data) {
      throw new NoteServiceError(
        'No data returned from search',
        ERROR_CODES.SEARCH_FAILED,
      );
    }

    return data.map(mapDbNoteToNote);
  } catch (error) {
    console.error('Error searching notes:', error);
    throw error;
  }
}

function mapDbNoteToNote(dbNote: Record<string, unknown>): Note {
  const tags = Array.isArray(dbNote.tags) ? (dbNote.tags as string[]) : [];
  const linkedNotes = Array.isArray(dbNote.linked_notes)
    ? (dbNote.linked_notes as string[])
    : [];
  const isFavorite = typeof dbNote.is_favorite === 'boolean' ? dbNote.is_favorite : false;

  return {
    id: dbNote.id as string,
    title: dbNote.title as string,
    content: dbNote.content as string,
    tags,
    pillar: dbNote.pillar as 'career' | 'social' | 'hobby',
    isFavorite,
    createdAt: dbNote.created_at as string,
    updatedAt: dbNote.updated_at as string,
    linkedNotes,
  };
}

