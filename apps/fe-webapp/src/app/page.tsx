'use client';

import { useState } from 'react';
import { AppSidebar } from '@/components/sidebar/Sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { NoteEditor } from '@/components/editor/NoteEditor';
import { GraphView } from '@/components/graph/GraphView';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { VoiceNoteRecorder } from '@/components/voice-note/VoiceNoteRecorder';
import { useNoteStore } from '@/stores/noteStore';
import { useNotes } from '@/hooks/useNotes';
import { APP_CONFIG, UI_MESSAGES, FORMATTING, DEFAULT_TAGS, DEFAULT_VALUES, DEFAULT_MESSAGES } from '@/constants';
import { EMPTY_NOTE } from '@/data/mockData';

export default function Home() {
  const { viewMode, setViewMode, setCurrentNote, addNote, selectedPillar } = useNoteStore();
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  useNotes();

  const handleNewNote = () => {
    const now = new Date().toISOString();
    const pillar = selectedPillar === 'all' ? APP_CONFIG.DEFAULT_PILLAR : selectedPillar;
    
    const newNote = {
      id: `note-${Date.now()}`,
      title: UI_MESSAGES.NEW_NOTE_TITLE,
      content: EMPTY_NOTE.content,
      tags: EMPTY_NOTE.tags,
      pillar,
      createdAt: now,
      updatedAt: now,
      linkedNotes: EMPTY_NOTE.linkedNotes,
      isFavorite: EMPTY_NOTE.isFavorite,
    };
    addNote(newNote);
    setCurrentNote(newNote);
    setViewMode('note');
  };

  const handleNewVoiceNote = () => {
    setShowVoiceRecorder(true);
  };

  const handleVoiceNoteSave = async (audioBlob: Blob, duration: number) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Audio = reader.result as string;
      const now = new Date().toISOString();
      const pillar = selectedPillar === 'all' ? APP_CONFIG.DEFAULT_PILLAR : selectedPillar;
      const formattedDuration = `${Math.floor(duration / FORMATTING.DURATION_MINUTES_PER_HOUR)}:${(duration % FORMATTING.DURATION_SECONDS_PER_MINUTE).toString().padStart(FORMATTING.DURATION_PAD_START, '0')}`;
      const recordedDate = new Date().toLocaleString(FORMATTING.DATE_LOCALE);
      
      const audioContent = `# ${UI_MESSAGES.NEW_VOICE_NOTE_TITLE}\n\n<audio controls>\n  <source src="${base64Audio}" type="${DEFAULT_VALUES.AUDIO_MIME_TYPE}">\n  ${DEFAULT_MESSAGES.AUDIO_NOT_SUPPORTED}\n</audio>\n\n*Duración: ${formattedDuration}*\n\n*Grabado el ${recordedDate}*`;
      
      const newNote = {
        id: `note-${Date.now()}`,
        title: `${UI_MESSAGES.NEW_VOICE_NOTE_TITLE} - ${new Date().toLocaleDateString(FORMATTING.DATE_LOCALE)}`,
        content: audioContent,
        tags: DEFAULT_TAGS.VOICE_NOTE,
        pillar,
        createdAt: now,
        updatedAt: now,
        linkedNotes: [],
        isFavorite: false,
      };
      
      addNote(newNote);
      setCurrentNote(newNote);
      setViewMode('note');
      setShowVoiceRecorder(false);
    };
    reader.readAsDataURL(audioBlob);
  };

  const handleVoiceNoteCancel = () => {
    setShowVoiceRecorder(false);
  };

  const renderMainContent = () => {
    switch (viewMode) {
      case 'dashboard':
        return <Dashboard />;
      case 'graph':
        return <GraphView />;
      case 'note':
        return <NoteEditor />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 z-10 bg-background">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 overflow-hidden relative">
          {renderMainContent()}
          {showVoiceRecorder && (
            <VoiceNoteRecorder
              onSave={handleVoiceNoteSave}
              onCancel={handleVoiceNoteCancel}
            />
          )}
        </main>
      </SidebarInset>
      {!showVoiceRecorder && (
        <FloatingActionButton
          onNewNote={handleNewNote}
          onNewVoiceNote={handleNewVoiceNote}
        />
      )}
    </SidebarProvider>
  );
}
