'use client';

import type { Message } from '@/types/chat';
import { MessageStatus, MessageType } from '@/types/chat';
import { AlertCircle, Check, Clock, Loader2 } from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';

interface MessageBubbleProps {
  message: Message;
  onRetry?: (messageId: string) => void;
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const renderStatusIcon = () => {
    switch (message.status) {
      case MessageStatus.Sending:
        return <Clock className="opacity-70 w-3.5 h-3.5" />;
      case MessageStatus.Transcribing:
        return <Loader2 className="opacity-70 w-3.5 h-3.5 animate-spin" />;
      case MessageStatus.Sent:
        return <Check className="opacity-70 w-3.5 h-3.5" />;
      case MessageStatus.Error:
        return (
          <button
            type="button"
            onClick={() => onRetry?.(message.id)}
            className="hover:opacity-80 transition-opacity"
          >
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          </button>
        );
    }
  };

  const isAssistant = message.sender === 'assistant';
  const alignmentClass = isAssistant ? 'justify-start' : 'justify-end';
  const bubbleClass = isAssistant
    ? 'max-w-[75%] bg-white text-gray-900 rounded-2xl rounded-bl-sm p-3 shadow border border-gray-200'
    : 'max-w-[75%] bg-blue-600 text-white rounded-2xl rounded-br-sm p-3 shadow-md';

  return (
    <div className={`flex ${alignmentClass} px-4 py-1 animate-in fade-in duration-300`}>
      <div className={`${bubbleClass} animate-in zoom-in-95 duration-200`}>
        {message.type === MessageType.Text ? (
          <p className="text-base wrap-break-word whitespace-pre-wrap">{message.text}</p>
        ) : (
          <div className="space-y-2">
            <AudioPlayer message={message} />
            
            {/* Transcription loading indicator */}
            {message.status === MessageStatus.Transcribing && (
              <div className="bg-black/10 p-3 border-white/30 border-l-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="opacity-70 w-4 h-4 animate-spin" />
                  <p className="opacity-70 text-sm">Transcribiendo audio...</p>
                </div>
                <div className="bg-white/20 mt-2 rounded-full h-1 overflow-hidden">
                  <div className="bg-white/40 rounded-full h-full animate-pulse"></div>
                </div>
              </div>
            )}
            
            {/* Transcription result */}
            {message.transcriptionText && message.status !== MessageStatus.Transcribing && (
              <div className="bg-black/10 p-2 border-white/30 border-l-2 rounded-lg">
                <p className="opacity-70 mb-1 text-xs">Transcripción:</p>
                <p className="text-sm wrap-break-word whitespace-pre-wrap">{message.transcriptionText}</p>
              </div>
            )}
            
            {/* Error message */}
            {message.status === MessageStatus.Error && message.errorMessage && (
              <div className="bg-red-500/20 p-2 border-red-300 border-l-2 rounded-lg">
                <p className="opacity-70 mb-1 text-xs">Error:</p>
                <p className="text-sm">{message.errorMessage}</p>
              </div>
            )}
          </div>
        )}

        <div className={`flex items-center ${isAssistant ? 'justify-start' : 'justify-end'} gap-1 mt-1`}>
          <span className="opacity-70 text-xs">
            {formatTime(message.timestamp)}
          </span>
          {renderStatusIcon()}
        </div>
      </div>
    </div>
  );
}

