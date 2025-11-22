'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import * as React from 'react';
import { useNoteStore } from '@/stores/noteStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Eye, Edit, X, Star } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';
import type { Components } from 'react-markdown';
import { APP_CONFIG, UI_MESSAGES, DEFAULT_VALUES, FORMATTING } from '@/constants';

export function NoteEditor() {
  const {
    currentNote,
    editorTitle,
    editorContent,
    editorTags,
    editorTagInput,
    editorViewMode,
    editorHasChanges,
    setEditorTitle,
    setEditorContent,
    setEditorTagInput,
    setEditorViewMode,
    addEditorTag,
    removeEditorTag,
    updateNote,
    toggleNoteFavorite,
  } = useNoteStore();

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Evitar hidration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Componentes personalizados para ReactMarkdown (memoizados para evitar recreación)
  const markdownComponents: Partial<Components> = useMemo(() => {
    // Seleccionar estilo según el tema
    const codeStyle = mounted && theme === 'dark' 
      ? vscDarkPlus 
      : oneLight;

    return {
      // Renderizado personalizado para bloques de código
      code({ className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || '');
        const language = match ? match[1] : '';
        const isInline = !className || !match;
        
        return !isInline && language ? (
          <SyntaxHighlighter
            style={codeStyle as Record<string, React.CSSProperties>}
            language={language}
            PreTag="div"
            className="rounded-md"
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        ) : (
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono" {...props}>
            {children}
          </code>
        );
      },
    };
  }, [theme, mounted]);

  // Auto-save cuando hay cambios
  useEffect(() => {
    if (!currentNote || !editorHasChanges) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      updateNote(currentNote.id, {
        title: editorTitle,
        content: editorContent,
        tags: editorTags,
      });
    }, APP_CONFIG.AUTO_SAVE_DELAY_MS);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [editorTitle, editorContent, editorTags, currentNote, editorHasChanges, updateNote]);

  const handleDownload = () => {
    if (!currentNote) return;

    const markdown = `# ${editorTitle}\n\n${editorContent}\n\n${editorTags.map((tag) => `#${tag}`).join(' ')}`;
    const blob = new Blob([markdown], { type: DEFAULT_VALUES.MARKDOWN_FILE_TYPE });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editorTitle.replace(FORMATTING.FILE_NAME_REPLACE_PATTERN, FORMATTING.FILE_NAME_REPLACE_WITH)}${DEFAULT_VALUES.MARKDOWN_FILE_EXTENSION}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!currentNote) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {UI_MESSAGES.SELECT_OR_CREATE_NOTE}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <Input
            value={editorTitle}
            onChange={(e) => setEditorTitle(e.target.value)}
            placeholder={UI_MESSAGES.NOTE_TITLE_PLACEHOLDER}
            className="text-xl font-semibold border-0 focus-visible:ring-0"
          />
          <div className="flex items-center gap-2">
            {editorHasChanges && (
              <span className="text-xs text-muted-foreground">{UI_MESSAGES.SAVING}</span>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => currentNote && toggleNoteFavorite(currentNote.id)}
              title={currentNote?.isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
            >
              <Star
                className={`h-4 w-4 ${
                  currentNote?.isFavorite
                    ? 'fill-yellow-500 text-yellow-500'
                    : ''
                }`}
              />
            </Button>
            <Button variant="outline" size="icon" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setEditorViewMode(editorViewMode === 'edit' ? 'preview' : 'edit')
              }
            >
              {editorViewMode === 'edit' ? (
                <Eye className="h-4 w-4" />
              ) : (
                <Edit className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {editorTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs"
            >
              #{tag}
              <button
                onClick={() => removeEditorTag(tag)}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <Input
            value={editorTagInput}
            onChange={(e) => setEditorTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addEditorTag(editorTagInput);
              }
            }}
            placeholder={UI_MESSAGES.TAG_PLACEHOLDER}
            className="h-7 w-32 text-xs"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {editorViewMode === 'edit' ? (
          <textarea
            value={editorContent}
            onChange={(e) => setEditorContent(e.target.value)}
            placeholder={UI_MESSAGES.NOTE_CONTENT_PLACEHOLDER}
            className="h-full w-full resize-none border-0 p-6 font-mono text-sm focus:outline-none"
          />
        ) : (
          <div className="prose prose-sm prose-slate max-w-none p-6 dark:prose-invert">
            <ReactMarkdown rehypePlugins={[rehypeRaw]} components={markdownComponents}>
              {editorContent || UI_MESSAGES.NO_CONTENT}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

