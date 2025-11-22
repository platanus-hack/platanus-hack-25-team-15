'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, X, Check, FileText, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UI_MESSAGES, FORMATTING, MEDIA_RECORDING, MEDIA_PLAYBACK } from '@/constants';
import { transcribeAudioDirect } from '@/services/transcriptionService';

interface VoiceNoteRecorderProps {
  onSave: (audioBlob: Blob, duration: number, transcription?: string, memoryId?: number) => void;
  onCancel: () => void;
  enableTranscription?: boolean;
}

export function VoiceNoteRecorder({ 
  onSave, 
  onCancel, 
  enableTranscription = true 
}: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [showTranscription, setShowTranscription] = useState(false);
  const [memoryId, setMemoryId] = useState<number | undefined>(undefined);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Formatear duración en formato MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / FORMATTING.DURATION_MINUTES_PER_HOUR);
    const secs = Math.floor(seconds % FORMATTING.DURATION_SECONDS_PER_MINUTE);
    return `${mins.toString().padStart(FORMATTING.DURATION_PAD_START, '0')}:${secs.toString().padStart(FORMATTING.DURATION_PAD_START, '0')}`;
  };

  // Iniciar grabación
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(MEDIA_RECORDING.AUDIO_CONSTRAINTS);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > MEDIA_PLAYBACK.MIN_DATA_SIZE) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: MEDIA_RECORDING.AUDIO_MIME_TYPE });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      // Actualizar duración cada segundo
      intervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, MEDIA_RECORDING.DURATION_UPDATE_INTERVAL);
    } catch (error) {
      console.error('Error al iniciar grabación:', error);
      alert('No se pudo acceder al micrófono. Por favor, verifica los permisos.');
    }
  };

  // Detener grabación
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  // Reproducir audio grabado
  const playAudio = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // Transcribir audio
  const handleTranscribe = async () => {
    if (!audioBlob) return;

    setIsTranscribing(true);
    setTranscriptionError(null);

    try {
      const result = await transcribeAudioDirect(
        audioBlob, 
        'recording.wav',
        'voice_note', // category
        'webapp_recorder' // source
      );
      
      const transcriptionText = result.transcription.text || '';
      
      if (!transcriptionText.trim()) {
        throw new Error('La transcripción está vacía. Por favor intenta de nuevo.');
      }

      setTranscription(transcriptionText);
      setShowTranscription(true);
      
      // Guardar el ID de memoria si existe
      if (result.memory?.id) {
        setMemoryId(result.memory.id);
      }
    } catch (err) {
      console.error('Error transcribing audio:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Error al transcribir el audio. Verifica que el servicio esté activo.';
      setTranscriptionError(errorMessage);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Guardar nota de voz
  const handleSave = () => {
    if (audioBlob) {
      onSave(audioBlob, duration, transcription || undefined, memoryId);
    }
  };

  // Limpiar recursos al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [audioUrl, isRecording]);

  return (
    <Card className="fixed inset-4 z-50 flex flex-col max-w-2xl mx-auto max-h-[90vh] overflow-hidden">
      <CardContent className="flex flex-col p-6 gap-4 overflow-y-auto">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Grabar Nota de Voz</h3>
          <p className="text-sm text-muted-foreground">
            {isRecording ? UI_MESSAGES.RECORDING : audioBlob ? UI_MESSAGES.AUDIO_RECORDED : UI_MESSAGES.PRESS_TO_START}
          </p>
        </div>

        {/* Indicador de duración */}
        <div className="text-3xl font-mono font-bold text-center">
          {formatDuration(duration)}
        </div>

        {/* Botones de control */}
        <div className="flex gap-3 items-center justify-center">
          {!audioBlob ? (
            <>
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  size="lg"
                  className="h-16 w-16 rounded-full"
                  variant="default"
                >
                  <Mic className="h-8 w-8" />
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  size="lg"
                  className="h-16 w-16 rounded-full"
                  variant="destructive"
                >
                  <Square className="h-8 w-8" />
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                onClick={playAudio}
                size="lg"
                variant="outline"
                className="h-12 w-12 rounded-full"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
              </Button>
              <Button
                onClick={handleSave}
                size="lg"
                variant="default"
                className="h-12 w-12 rounded-full"
                disabled={enableTranscription && !transcription && !transcriptionError}
                title={enableTranscription && !transcription ? "Transcribe el audio primero" : "Guardar nota"}
              >
                <Check className="h-6 w-6" />
              </Button>
            </>
          )}
          <Button
            onClick={onCancel}
            size="lg"
            variant="outline"
            className="h-12 w-12 rounded-full"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Audio element para reproducción */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="w-full mt-2"
            controls
          />
        )}

        {/* Botón de transcripción */}
        {audioBlob && enableTranscription && !showTranscription && (
          <div className="mt-4">
            <Button
              onClick={handleTranscribe}
              disabled={isTranscribing}
              className="w-full"
              variant="secondary"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transcribiendo...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Transcribir Audio
                </>
              )}
            </Button>
          </div>
        )}

        {/* Error de transcripción */}
        {transcriptionError && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Error de transcripción</p>
                <p className="text-sm text-destructive/80 mt-1">{transcriptionError}</p>
                <Button
                  onClick={handleTranscribe}
                  disabled={isTranscribing}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Reintentar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Resultado de transcripción */}
        {showTranscription && transcription && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h4 className="text-sm font-semibold">Transcripción</h4>
              </div>
              {memoryId && (
                <div className="flex items-center gap-1.5 text-xs text-success">
                  <Check className="h-3.5 w-3.5" />
                  <span>Guardado en memoria RAG #{memoryId}</span>
                </div>
              )}
            </div>
            <textarea
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              className="w-full min-h-[150px] p-3 bg-muted/50 border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="La transcripción aparecerá aquí..."
            />
            <p className="text-xs text-muted-foreground">
              {memoryId 
                ? 'Transcripción almacenada en el sistema de memoria. Puedes editarla antes de guardar la nota.'
                : 'Puedes editar la transcripción antes de guardar'}
            </p>
          </div>
        )}

        {/* Instrucciones */}
        {!audioBlob && !isRecording && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Instrucciones:</span> Presiona el botón de micrófono para 
              comenzar a grabar. Cuando termines, presiona el botón cuadrado para detener. 
              {enableTranscription && ' Luego podrás transcribir el audio automáticamente.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

