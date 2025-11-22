'use client';

import { useState } from 'react';
import { Plus, FileText, Mic, X } from 'lucide-react';
import { Button } from './button';
import { Card } from './card';

interface FloatingActionButtonProps {
  onNewNote: () => void;
  onNewVoiceNote: () => void;
}

export function FloatingActionButton({ onNewNote, onNewVoiceNote }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleNewNote = () => {
    setIsOpen(false);
    onNewNote();
  };

  const handleNewVoiceNote = () => {
    setIsOpen(false);
    onNewVoiceNote();
  };

  if (isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
        <Card className="p-2 shadow-xl min-w-[200px]">
          <div className="flex flex-col gap-1">
            <Button
              onClick={handleNewNote}
              className="w-full justify-start gap-3"
              variant="ghost"
            >
              <FileText className="h-5 w-5" />
              Nueva Nota
            </Button>
            <Button
              onClick={handleNewVoiceNote}
              className="w-full justify-start gap-3"
              variant="ghost"
            >
              <Mic className="h-5 w-5" />
              Nota de Voz
            </Button>
          </div>
        </Card>
        <Button
          onClick={() => setIsOpen(false)}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 self-end"
          aria-label="Cerrar menú"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => setIsOpen(true)}
      size="lg"
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-[100]"
      aria-label="Crear nueva nota"
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
}

