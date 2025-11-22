'use client';

import { env } from '@/config/env';
import type { Message } from '@/types/chat';
import { MessageStatus, MessageType } from '@/types/chat';

class ChatService {
  private static instance: ChatService;
  private messages: Message[] = [];
  private apiBaseUrl: string | null = null;
  private ragApiUrl: string | null = null;
  private onMessagesChange?: () => void;

  private constructor() {
    // Initialize with speech-to-text API URL
    this.apiBaseUrl = env.speechToTextApiUrl;
    // RAG API URL
    this.ragApiUrl = env.ragApiUrl || null;
  }

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  setApiUrl(url: string) {
    this.apiBaseUrl = url;
  }

  setOnMessagesChange(callback: () => void) {
    this.onMessagesChange = callback;
  }

  private notifyChange() {
    if (this.onMessagesChange) {
      this.onMessagesChange();
    }
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  async sendTextMessage(text: string): Promise<Message> {
    const message: Message = {
      id: crypto.randomUUID(),
      type: MessageType.Text,
      sender: 'user',
      text,
      timestamp: new Date(),
      status: MessageStatus.Sending,
    };

    this.messages.push(message);
    this.notifyChange();

    try {
      await this.sendToApi(message);
      message.status = MessageStatus.Sent;
      this.notifyChange();
    } catch (error) {
      message.status = MessageStatus.Error;
      if (error instanceof Error) {
        message.errorMessage = error.message;
      } else {
        message.errorMessage = 'Unknown error';
      }
      this.notifyChange();
    }

    return message;
  }

  async sendAudioMessage(
    audioData: Uint8Array,
    fileName: string,
    duration: number,
    blobUrl?: string,
    mimeType?: string
  ): Promise<Message> {
    const message: Message = {
      id: crypto.randomUUID(),
      type: MessageType.Audio,
      sender: 'user',
      audioData,
      audioFileName: fileName,
      audioDuration: duration,
      audioMimeType: mimeType,
      audioBlobUrl: blobUrl,
      timestamp: new Date(),
      status: MessageStatus.Sending,
    };

    this.messages.push(message);
    this.notifyChange();

    try {
      await this.sendToApi(message);
      // Status is updated inside sendAudioToTranscriptionApi
    } catch (error) {
      message.status = MessageStatus.Error;
      if (error instanceof Error) {
        message.errorMessage = error.message;
      }
    }

    return message;
  }

  private async sendToApi(message: Message): Promise<void> {
    // For audio messages, send to transcription API
    if (message.type === MessageType.Audio && message.audioData) {
      await this.sendAudioToTranscriptionApi(message);
      return;
    }

    // For text messages, call the RAG /process
    if (message.type === MessageType.Text) {
      await this.sendTextToProcessApi(message);
      return;
    }
  }

  private pushAssistantMessage(text: string) {
    const assistant: Message = {
      id: crypto.randomUUID(),
      type: MessageType.Text,
      sender: 'assistant',
      text,
      timestamp: new Date(),
      status: MessageStatus.Sent,
    };
    this.messages.push(assistant);
    this.notifyChange();
  }

  private pushAssistantStreamStart(): string {
    const id = crypto.randomUUID();
    const assistant: Message = {
      id,
      type: MessageType.Text,
      sender: 'assistant',
      text: '',
      timestamp: new Date(),
      status: MessageStatus.Sending,
    };
    this.messages.push(assistant);
    this.notifyChange();
    return id;
  }

  private appendToAssistantMessage(messageId: string, chunk: string) {
    const msg = this.messages.find((m) => m.id === messageId);
    if (!msg) return;
    msg.text = (msg.text || '') + chunk;
    this.notifyChange();
  }

  private finalizeAssistantMessage(messageId: string) {
    const msg = this.messages.find((m) => m.id === messageId);
    if (!msg) return;
    msg.status = MessageStatus.Sent;
    this.notifyChange();
  }

  private async sendTextToProcessApi(message: Message): Promise<void> {
    const text = (message.text || '').trim();
    if (!text) {
      message.status = MessageStatus.Error;
      message.errorMessage = 'Empty text';
      this.notifyChange();
      throw new Error('Empty text');
    }

    try {
      console.log('🛰️ Sending text to /api/process (stream=1)');
      const response = await fetch(`/api/process?stream=1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source: 'web_chat' }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        message.status = MessageStatus.Error;
        message.errorMessage = `RAG Error: ${response.status} - ${errorText}`;
        this.notifyChange();
        throw new Error(`RAG /process error: ${response.status} - ${errorText}`);
      }

      const ctype = response.headers.get('content-type') || '';
      // Treat non-JSON as stream (AI SDK may use text/event-stream or text/stream)
      if (!ctype.includes('application/json')) {
        // streaming answer
        const botId = this.pushAssistantStreamStart();
        const reader = response.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunkText = decoder.decode(value);
            if (chunkText) {
              this.appendToAssistantMessage(botId, chunkText);
            }
          }
          this.finalizeAssistantMessage(botId);
        }
        message.status = MessageStatus.Sent;
        this.notifyChange();
      } else {
        // JSON response (save path)
        const result = await response.json();
        console.log('✅ RAG PROCESS RESULT (json)', result);
        message.status = MessageStatus.Sent;
        this.notifyChange();
        if (result.action === 'saved') {
          const id = result.memory?.id;
          const ack = id ? `Guardado en memoria (id ${id}).` : 'Guardado en memoria.';
          this.pushAssistantMessage(ack);
        }
      }
    } catch (error) {
      console.error('❌ RAG PROCESS ERROR:', error);
      message.status = MessageStatus.Error;
      if (error instanceof Error) {
        message.errorMessage = error.message;
      } else {
        message.errorMessage = 'Unknown RAG process error';
      }
      this.notifyChange();
      throw error;
    }
  }

  private async sendAudioToTranscriptionApi(message: Message): Promise<void> {
    if (!message.audioData) {
      throw new Error('No audio data available');
    }

    // Update status to transcribing at the start
    message.status = MessageStatus.Transcribing;
    this.notifyChange();

    const audioBase64 = this.arrayBufferToBase64(message.audioData);
    
    // Prepare transcription request payload
    const transcriptionPayload = {
      audio_base64: audioBase64,
      filename: message.audioFileName || 'audio.webm',
      // no auto-store here; we will route via /process after transcription
    };

    // Log the request for debugging
    console.log('═══════════════════════════════════════════');
    console.log('🎤 TRANSCRIPTION API REQUEST');
    console.log('═══════════════════════════════════════════');
    console.log('URL:', `${this.apiBaseUrl}/transcribe/direct`);
    console.log('Payload:', {
      ...transcriptionPayload,
      audio_base64: `${audioBase64.substring(0, 50)}... (${audioBase64.length} chars)`
    });
    console.log('═══════════════════════════════════════════');

    if (!this.apiBaseUrl) {
      message.status = MessageStatus.Error;
      message.errorMessage = 'Speech-to-text API URL not configured';
      this.notifyChange();
      throw new Error('Speech-to-text API URL not configured');
    }

    try {
      // Try speech_to_text_api JSON direct endpoint first
      let transcribedText: string | undefined;
      try {
        const response = await fetch(`${this.apiBaseUrl}/transcribe/direct`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transcriptionPayload),
        });
        if (response.ok) {
          const result = await response.json();
          console.log('✅ TRANSCRIPTION SUCCESS (direct)');
          console.log('Transcription result:', result.transcription);
          transcribedText = result?.transcription?.text;
        } else {
          throw new Error(`Direct endpoint not available: ${response.status}`);
        }
      } catch (_e) {
        // Fallback to api-sst multipart /speech-to-text
        console.log('Falling back to /speech-to-text (multipart)');
        const blob = new Blob([message.audioData], {
          type: message.audioMimeType || 'audio/webm',
        });
        const file = new File(
          [blob],
          message.audioFileName || 'audio.webm',
          { type: message.audioMimeType || 'audio/webm' }
        );
        const form = new FormData();
        form.append('file', file);
        form.append('language', 'es');

        const response = await fetch(`${this.apiBaseUrl}/speech-to-text`, {
          method: 'POST',
          body: form,
        });
        if (!response.ok) {
          const errorText = await response.text();
          message.status = MessageStatus.Error;
          message.errorMessage = `API Error: ${response.status} - ${errorText}`;
          this.notifyChange();
          throw new Error(`Transcription API error: ${response.status} - ${errorText}`);
        }
        const result = await response.json();
        console.log('✅ TRANSCRIPTION SUCCESS (multipart)');
        console.log('Transcription result:', result);
        transcribedText = result?.text;
      }

      if (transcribedText) {
        message.transcriptionText = transcribedText;
      }

      // Route to RAG /process
      console.log('🛰️ Sending transcribed text to /api/process (stream=1)');
      const processResponse = await fetch(`/api/process?stream=1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: result.transcription?.text || '',
          source: message.audioFileName || 'web_chat_audio',
          category: 'audio_transcription'
        }),
      });

      if (!processResponse.ok) {
        const errorText = await processResponse.text();
        message.status = MessageStatus.Error;
        message.errorMessage = `RAG Error: ${processResponse.status} - ${errorText}`;
        this.notifyChange();
        throw new Error(`RAG /process error: ${processResponse.status} - ${errorText}`);
      }

      const ctype = processResponse.headers.get('content-type') || '';
      if (!ctype.includes('application/json')) {
        const botId = this.pushAssistantStreamStart();
        const reader = processResponse.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunkText = decoder.decode(value);
            if (chunkText) {
              this.appendToAssistantMessage(botId, chunkText);
            }
          }
          this.finalizeAssistantMessage(botId);
        }
        message.status = MessageStatus.Sent;
        this.notifyChange();
      } else {
        const processResult = await processResponse.json();
        console.log('✅ RAG PROCESS RESULT (audio):', processResult);
        // Mark as sent after processing
        message.status = MessageStatus.Sent;
        this.notifyChange();
        if (processResult.action === 'saved') {
          const id = processResult.memory?.id;
          const ack = id ? `Guardado en memoria (id ${id}).` : 'Guardado en memoria.';
          this.pushAssistantMessage(ack);
        }
      }
    } catch (error) {
      console.error('❌ TRANSCRIPTION ERROR:', error);
      message.status = MessageStatus.Error;
      if (error instanceof Error) {
        message.errorMessage = error.message;
      } else {
        message.errorMessage = 'Unknown transcription error';
      }
      this.notifyChange();
      throw error;
    }
  }

  async retryMessage(messageId: string): Promise<void> {
    const message = this.messages.find(m => m.id === messageId);
    if (!message) return;

    message.status = MessageStatus.Sending;

    try {
      await this.sendToApi(message);
      message.status = MessageStatus.Sent;
    } catch (error) {
      message.status = MessageStatus.Error;
      if (error instanceof Error) {
        message.errorMessage = error.message;
      } else {
        message.errorMessage = 'Unknown error';
      }
    }
  }

  clearMessages() {
    this.messages = [];
  }

  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }
}

export default ChatService.getInstance();
