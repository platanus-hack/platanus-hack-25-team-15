# VoiceNoteRecorder Component

Componente mejorado para grabar notas de voz con transcripción automática usando el servicio de speech-to-text.

## Características

- ✅ Grabación de audio desde el micrófono
- ✅ Reproducción del audio grabado
- ✅ Transcripción automática usando API de Speech-to-Text
- ✅ **Almacenamiento automático en sistema RAG Memory**
- ✅ Edición de la transcripción antes de guardar
- ✅ Manejo de errores con reintentos
- ✅ UI moderna y responsiva
- ✅ Soporte para dark mode
- ✅ Indicador de memoria RAG creada

## Uso

### Ejemplo Básico

```tsx
import { VoiceNoteRecorder } from '@/components/voice-note/VoiceNoteRecorder';

function MyComponent() {
  const [showRecorder, setShowRecorder] = useState(false);

  const handleSave = (
    audioBlob: Blob, 
    duration: number, 
    transcription?: string, 
    memoryId?: number
  ) => {
    console.log('Audio grabado:', audioBlob);
    console.log('Duración:', duration, 'segundos');
    console.log('Transcripción:', transcription);
    console.log('Memory ID en RAG:', memoryId);
    
    // Aquí puedes guardar la nota en tu store o API
    // Por ejemplo:
    // noteStore.addNote({
    //   title: `Nota de voz - ${new Date().toLocaleDateString()}`,
    //   content: transcription || '',
    //   audioBlob,
    //   duration,
    //   memoryId // ID de la memoria en el sistema RAG
    // });
    
    setShowRecorder(false);
  };

  return (
    <>
      <button onClick={() => setShowRecorder(true)}>
        Grabar Nota de Voz
      </button>
      
      {showRecorder && (
        <VoiceNoteRecorder
          onSave={handleSave}
          onCancel={() => setShowRecorder(false)}
          enableTranscription={true}
        />
      )}
    </>
  );
}
```

### Sin Transcripción

Si solo necesitas grabar audio sin transcripción:

```tsx
<VoiceNoteRecorder
  onSave={handleSave}
  onCancel={handleCancel}
  enableTranscription={false}
/>
```

## Props

| Prop | Tipo | Requerido | Default | Descripción |
|------|------|-----------|---------|-------------|
| `onSave` | `(audioBlob: Blob, duration: number, transcription?: string, memoryId?: number) => void` | ✅ | - | Callback cuando se guarda la nota. Incluye el ID de memoria RAG si se transcribió |
| `onCancel` | `() => void` | ✅ | - | Callback cuando se cancela la grabación |
| `enableTranscription` | `boolean` | ❌ | `true` | Habilitar funcionalidad de transcripción |

## Variables de Entorno

Asegúrate de configurar la URL del API de Speech-to-Text:

```env
NEXT_PUBLIC_STT_API_URL=http://localhost:8001
```

## Integración con Sistema RAG Memory

Cuando se transcribe un audio, automáticamente se crea una entrada en el sistema de memoria RAG (Retrieval-Augmented Generation). Esto permite:

- 🔍 **Búsqueda semántica**: Encontrar notas por similitud de contenido
- 🧠 **Memoria persistente**: Las transcripciones se almacenan en un grafo de conocimiento
- 🏷️ **Categorización**: Cada transcripción se etiqueta como `voice_note`
- 📊 **Análisis**: Las notas de voz se pueden relacionar con otro contenido

El componente retorna el `memoryId` que puedes usar para:
- Referenciar la memoria en tu sistema de notas
- Recuperar la transcripción desde el sistema RAG
- Vincular con otros nodos del grafo de conocimiento

## Flujo de Uso

1. **Grabar**: El usuario presiona el botón de micrófono
2. **Detener**: Presiona el botón cuadrado para finalizar
3. **Reproducir**: Puede escuchar el audio antes de transcribir
4. **Transcribir**: Presiona "Transcribir Audio" para obtener el texto
5. **Almacenamiento RAG**: La transcripción se guarda automáticamente en el sistema de memoria RAG
6. **Editar**: Puede editar la transcripción si es necesario
7. **Guardar**: Presiona el botón de check para guardar la nota con referencia a la memoria RAG

## Estados del Componente

- `isRecording`: Indica si está grabando actualmente
- `audioBlob`: Blob del audio grabado
- `transcription`: Texto de la transcripción
- `isTranscribing`: Indica si está transcribiendo
- `transcriptionError`: Error de transcripción si ocurre

## Servicios Relacionados

### TranscriptionService

El componente usa el servicio `transcriptionService.ts`:

```typescript
import { transcribeAudioDirect } from '@/services/transcriptionService';

// Transcribir audio
const result = await transcribeAudioDirect(
  audioBlob,
  'recording.wav',
  'es' // idioma
);
```

## Manejo de Errores

El componente maneja automáticamente:

- ❌ Errores de permisos de micrófono
- ❌ Errores de red al transcribir
- ❌ Transcripciones vacías
- ❌ API no disponible

Todos los errores se muestran al usuario con opción de reintentar.

## Estilos y Temas

El componente usa:
- Componentes UI de shadcn/ui
- Tailwind CSS para estilos
- Soporte automático para dark mode
- Diseño responsivo

## Ejemplo Completo con Store

```tsx
'use client';

import { useState } from 'react';
import { VoiceNoteRecorder } from '@/components/voice-note/VoiceNoteRecorder';
import { useNoteStore } from '@/stores/noteStore';
import { Button } from '@/components/ui/button';
import { Mic } from 'lucide-react';

export function NotePage() {
  const [showRecorder, setShowRecorder] = useState(false);
  const { addNote } = useNoteStore();

  const handleSaveVoiceNote = async (
    audioBlob: Blob,
    duration: number,
    transcription?: string,
    memoryId?: number
  ) => {
    try {
      // Convertir blob a base64 o subirlo a un servidor
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        
        // Guardar en el store con referencia a la memoria RAG
        addNote({
          title: `Nota de Voz - ${new Date().toLocaleDateString('es-ES')}`,
          content: transcription || '',
          tags: ['audio', 'voz', 'transcripción'],
          audioData: base64Audio,
          audioDuration: duration,
          memoryId, // ID de la memoria en el sistema RAG
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        // Opcional: Log para debugging
        if (memoryId) {
          console.log(`Nota vinculada a memoria RAG #${memoryId}`);
        }
        
        setShowRecorder(false);
      };
    } catch (error) {
      console.error('Error al guardar nota de voz:', error);
    }
  };

  return (
    <div>
      <Button onClick={() => setShowRecorder(true)}>
        <Mic className="mr-2 h-4 w-4" />
        Nueva Nota de Voz
      </Button>
      
      {showRecorder && (
        <VoiceNoteRecorder
          onSave={handleSaveVoiceNote}
          onCancel={() => setShowRecorder(false)}
        />
      )}
    </div>
  );
}
```

## Notas Importantes

1. **Permisos**: El navegador solicitará permisos de micrófono la primera vez
2. **HTTPS**: En producción, necesitas HTTPS para acceder al micrófono
3. **API**: Asegúrate de que el API de transcripción esté corriendo
4. **Formatos**: El audio se graba en el formato por defecto del navegador (usualmente webm)

## Troubleshooting

### No se puede acceder al micrófono
- Verifica los permisos del navegador
- En producción, usa HTTPS

### Error de transcripción
- Verifica que el API esté corriendo
- Revisa la URL en las variables de entorno
- Verifica los logs del servidor

### Transcripción vacía
- Verifica que el audio tenga contenido audible
- Intenta con un audio más largo
- Revisa la configuración del modelo de transcripción

