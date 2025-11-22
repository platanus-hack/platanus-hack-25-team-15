/**
 * Service for interacting with the Speech-to-Text API
 */

export interface MemoryResponse {
    id: number;
    text: string;
    category?: string;
    source?: string;
    created_at: string;
  }
  
  export interface TranscriptionResponse {
    transcription: {
      text: string;
      language_code?: string;
      confidence?: number;
      [key: string]: unknown;
    };
    memory: MemoryResponse;
    filename?: string;
  }
  
  const STT_API_BASE_URL = process.env.NEXT_PUBLIC_STT_API_URL || 'http://localhost:8001';
  
  /**
   * Convert ArrayBuffer to base64 string
   */
  function arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }
  
  /**
   * Convert a Blob to base64 string
   */
  async function blobToBase64(blob: Blob): Promise<string> {
    // Convert blob to ArrayBuffer first
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    return arrayBufferToBase64(uint8Array);
  }
  
  /**
   * Transcribe audio from a Blob and store in RAG memory
   */
  export async function transcribeAudioDirect(
    audioBlob: Blob,
    filename?: string,
    category?: string,
    source?: string
  ): Promise<TranscriptionResponse> {
    try {
      // Validate audio size (minimum 1KB to ensure it has content)
      if (audioBlob.size < 1000) {
        throw new Error('El audio es demasiado corto. Por favor graba al menos 1 segundo de audio.');
      }
  
      // Convert blob to base64
      const audioBase64 = await blobToBase64(audioBlob);
      
  
      // Send to API
      const response = await fetch(`${STT_API_BASE_URL}/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_base64: audioBase64,
          filename: filename || 'recording.wav',
          category: category,
          source: source,
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || `Failed to transcribe audio: ${response.statusText}`;
        console.error('API Error Response:', errorData);
        throw new Error(errorMessage);
      }
  
      const data = await response.json();
      console.log('Transcription response:', data);
      
      // Validate response structure
      if (!data.transcription || !data.transcription.text) {
        console.error('Invalid response structure:', data);
        throw new Error('La respuesta de la API no contiene texto de transcripción');
      }
      
      return data;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }
  
  /**
   * Check if the Speech-to-Text API is available
   */
  export async function checkSTTHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${STT_API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('STT API health check failed:', error);
      return false;
    }
  }