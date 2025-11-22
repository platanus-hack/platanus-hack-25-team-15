export enum MessageType {
  Text = 'text',
  Audio = 'audio'
}

export enum MessageStatus {
  Sending = 'sending',
  Transcribing = 'transcribing',
  Sent = 'sent',
  Error = 'error'
}

export interface Message {
  id: string;
  type: MessageType;
  sender?: 'user' | 'assistant';
  text?: string;
  audioData?: Uint8Array;
  audioFileName?: string;
  audioDuration?: number; // in milliseconds
  audioMimeType?: string; // Tipo MIME del audio
  timestamp: Date;
  status: MessageStatus;
  audioBlobUrl?: string; // Para reproducción directa
  transcriptionText?: string; // Transcribed text from audio
  errorMessage?: string; // Error message if processing failed
}

export interface ChatPayload {
  id: string;
  type: string;
  text?: string;
  audioFileName?: string;
  audioDuration?: number;
  audioBase64?: string;
  audioSize?: number;
  timestamp: string;
  transcriptionText?: string; // Transcribed text from audio
}
