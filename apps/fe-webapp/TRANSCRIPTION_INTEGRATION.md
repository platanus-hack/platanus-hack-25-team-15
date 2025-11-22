# 🎙️ Integración de Transcripción con Sistema RAG

## Resumen de la Integración

Este documento describe la integración completa del sistema de transcripción de audio con el sistema de memoria RAG (Retrieval-Augmented Generation) en la aplicación web.

## 📁 Arquitectura

```
apps/fe-webapp/
├── src/
│   ├── components/
│   │   └── voice-note/
│   │       ├── VoiceNoteRecorder.tsx    # Componente principal de grabación
│   │       └── README.md                 # Documentación del componente
│   └── services/
│       └── transcriptionService.ts       # Servicio de transcripción

apis/
└── api-sst/
    └── main.py                           # API de Speech-to-Text
```

## 🔄 Flujo de Datos

```mermaid
graph LR
    A[Usuario graba audio] --> B[VoiceNoteRecorder]
    B --> C[Blob de audio]
    C --> D[transcriptionService]
    D --> E[Convertir a Base64]
    E --> F[API STT /transcribe]
    F --> G[ElevenLabs/OpenAI]
    G --> H[Texto transcrito]
    H --> I[Sistema RAG Memory]
    I --> J[Memory ID + Transcripción]
    J --> K[VoiceNoteRecorder]
    K --> L[Usuario edita y guarda]
    L --> M[Store de Notas]
```

## 🛠️ Componentes

### 1. VoiceNoteRecorder Component

**Ubicación**: `apps/fe-webapp/src/components/voice-note/VoiceNoteRecorder.tsx`

**Props**:
```typescript
interface VoiceNoteRecorderProps {
  onSave: (
    audioBlob: Blob, 
    duration: number, 
    transcription?: string, 
    memoryId?: number
  ) => void;
  onCancel: () => void;
  enableTranscription?: boolean; // default: true
}
```

**Características**:
- ✅ Grabación de audio desde micrófono
- ✅ Reproducción del audio
- ✅ Transcripción automática
- ✅ Almacenamiento en RAG Memory
- ✅ Edición de transcripción
- ✅ Indicador visual de memoria RAG creada
- ✅ Manejo robusto de errores

**Estados Internos**:
```typescript
- isRecording: boolean           // Estado de grabación
- audioBlob: Blob | null         // Audio grabado
- transcription: string          // Texto transcrito
- isTranscribing: boolean        // Estado de transcripción
- transcriptionError: string     // Errores de transcripción
- memoryId: number | undefined   // ID en sistema RAG
```

### 2. TranscriptionService

**Ubicación**: `apps/fe-webapp/src/services/transcriptionService.ts`

**Funciones principales**:

```typescript
// Transcribir audio y almacenar en RAG
export async function transcribeAudioDirect(
  audioBlob: Blob,
  filename?: string,
  category?: string,
  source?: string
): Promise<TranscriptionResponse>

// Verificar salud del API
export async function checkSTTHealth(): Promise<boolean>
```

**Tipos**:
```typescript
interface TranscriptionResponse {
  transcription: {
    text: string;
    language_code?: string;
    confidence?: number;
  };
  memory: MemoryResponse;
  filename?: string;
}

interface MemoryResponse {
  id: number;
  text: string;
  category?: string;
  source?: string;
  created_at: string;
}
```

**Proceso de conversión**:
1. Audio Blob → ArrayBuffer
2. ArrayBuffer → Uint8Array
3. Uint8Array → Base64 String
4. Envío a API con JSON

### 3. Componentes Adicionales

#### TranscribePage (Demo completa)
- Grabación desde micrófono
- Carga de archivos de audio
- Visualización de resultados
- UI con tema oscuro personalizado

#### AudioTranscriber (Componente modular)
- Integración con store de notas
- Guardado automático
- UI con shadcn/ui

## 🔧 Configuración

### Variables de Entorno

```env
# .env.local
NEXT_PUBLIC_STT_API_URL=http://localhost:8001
```

### API Backend

El servicio espera un endpoint `/transcribe` con:

**Request**:
```json
{
  "audio_base64": "string",
  "filename": "recording.wav",
  "category": "voice_note",
  "source": "webapp_recorder"
}
```

**Response**:
```json
{
  "transcription": {
    "text": "Texto transcrito aquí...",
    "language_code": "es",
    "confidence": 0.95
  },
  "memory": {
    "id": 123,
    "text": "Texto transcrito aquí...",
    "category": "voice_note",
    "source": "webapp_recorder",
    "created_at": "2025-11-22T10:30:00"
  },
  "filename": "recording.wav"
}
```

## 💾 Integración con Sistema RAG

### ¿Qué es RAG Memory?

El sistema RAG (Retrieval-Augmented Generation) almacena las transcripciones en un grafo de conocimiento que permite:

1. **Búsqueda semántica**: Encontrar notas por significado, no solo palabras clave
2. **Relaciones**: Conectar notas relacionadas automáticamente
3. **Contexto**: Mantener el contexto de las conversaciones
4. **Recuperación**: Acceso rápido a información histórica

### Categorías y Fuentes

**Categoría**: `voice_note`
- Identifica el tipo de contenido
- Útil para filtrar en búsquedas
- Permite análisis específico de notas de voz

**Fuente**: `webapp_recorder`
- Indica el origen de la transcripción
- Permite trazabilidad
- Útil para auditoría

### Uso del Memory ID

El `memoryId` retornado se puede usar para:

```typescript
// 1. Vincular con notas
interface Note {
  id: string;
  title: string;
  content: string;
  memoryId?: number;  // Referencia a RAG
  // ...
}

// 2. Buscar contenido relacionado
const relatedNotes = await ragService.searchSimilar(memoryId, limit: 5);

// 3. Recuperar la memoria original
const memory = await ragService.getMemory(memoryId);

// 4. Actualizar la transcripción
await ragService.updateMemory(memoryId, { text: editedText });
```

## 📝 Ejemplos de Uso

### Ejemplo 1: Uso Básico

```tsx
import { VoiceNoteRecorder } from '@/components/voice-note/VoiceNoteRecorder';

function NotePage() {
  const [showRecorder, setShowRecorder] = useState(false);

  const handleSave = (blob, duration, transcription, memoryId) => {
    console.log('Transcripción:', transcription);
    console.log('Memory ID:', memoryId);
    setShowRecorder(false);
  };

  return (
    <>
      <button onClick={() => setShowRecorder(true)}>
        Nueva Nota de Voz
      </button>
      
      {showRecorder && (
        <VoiceNoteRecorder
          onSave={handleSave}
          onCancel={() => setShowRecorder(false)}
        />
      )}
    </>
  );
}
```

### Ejemplo 2: Con Store de Notas

```tsx
import { useNoteStore } from '@/stores/noteStore';

function NotePage() {
  const { addNote } = useNoteStore();
  const [showRecorder, setShowRecorder] = useState(false);

  const handleSaveVoiceNote = async (
    audioBlob: Blob,
    duration: number,
    transcription?: string,
    memoryId?: number
  ) => {
    // Convertir audio a base64
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    
    reader.onloadend = () => {
      const base64Audio = reader.result as string;
      
      addNote({
        title: `Nota de Voz - ${new Date().toLocaleDateString('es-ES')}`,
        content: transcription || '',
        tags: ['audio', 'transcripción'],
        audioData: base64Audio,
        audioDuration: duration,
        memoryId, // Vincula con RAG
        pillar: 'personal',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      setShowRecorder(false);
    };
  };

  return (
    <>
      <Button onClick={() => setShowRecorder(true)}>
        <Mic className="mr-2 h-4 w-4" />
        Grabar Nota de Voz
      </Button>
      
      {showRecorder && (
        <VoiceNoteRecorder
          onSave={handleSaveVoiceNote}
          onCancel={() => setShowRecorder(false)}
          enableTranscription={true}
        />
      )}
    </>
  );
}
```

### Ejemplo 3: Sin Transcripción (Solo Audio)

```tsx
<VoiceNoteRecorder
  onSave={(blob, duration) => {
    // Solo guardar audio, sin transcripción
    saveAudio(blob, duration);
  }}
  onCancel={() => setShowRecorder(false)}
  enableTranscription={false}  // Deshabilitar transcripción
/>
```

## 🎨 UI/UX

### Estados Visuales

1. **Inicial**: Botón de micrófono grande y centrado
2. **Grabando**: Botón rojo pulsante con contador
3. **Audio grabado**: Controles de reproducción + botón transcribir
4. **Transcribiendo**: Spinner animado con mensaje
5. **Transcrito**: 
   - Texto editable en textarea
   - Badge verde con Memory ID
   - Mensaje de confirmación
6. **Error**: Alert rojo con opción de reintentar

### Responsive Design

- **Desktop**: Modal centrado, ancho máximo 2xl
- **Mobile**: Se adapta al viewport, controles táctiles
- **Tablet**: Layout híbrido optimizado

## 🐛 Manejo de Errores

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| "No se pudo acceder al micrófono" | Permisos no otorgados | Verificar permisos del navegador |
| "El audio es demasiado corto" | Menos de 1KB | Grabar al menos 1 segundo |
| "Error al transcribir el audio" | API no disponible | Verificar que el servicio esté corriendo |
| "La transcripción está vacía" | Audio sin voz detectable | Grabar con mejor calidad de audio |

### Estrategia de Reintentos

- ✅ Botón "Reintentar" en errores de transcripción
- ✅ Preserva el audio grabado
- ✅ Muestra mensaje de error específico
- ✅ No pierde el trabajo del usuario

## 🔒 Seguridad

### Validaciones

1. **Tamaño de audio**: Mínimo 1KB
2. **Formato**: Solo audio/* MIME types
3. **Base64**: Validación de encoding
4. **API Response**: Verificación de estructura

### Permisos

- **Micrófono**: Solicitado explícitamente
- **HTTPS**: Requerido en producción
- **CORS**: Configurado en el API

## 📊 Performance

### Optimizaciones

- ✅ Conversión a base64 eficiente (no usa btoa directamente)
- ✅ Cleanup de URLs de objetos
- ✅ Estados de carga claros
- ✅ Cancelación de grabación limpia

### Límites

- **Tamaño de audio**: 25MB (configurable en API)
- **Duración**: Sin límite en el componente
- **Formatos**: Todos los formatos de audio del navegador

## 🚀 Despliegue

### Checklist Pre-Deploy

- [ ] Variables de entorno configuradas
- [ ] API de transcripción desplegada y accesible
- [ ] Sistema RAG Memory operativo
- [ ] HTTPS habilitado (producción)
- [ ] CORS configurado correctamente
- [ ] Logs de error configurados

### Monitoreo

Métricas importantes:
- Tasa de éxito de transcripciones
- Tiempo promedio de transcripción
- Tamaño promedio de audios
- Errores de API
- Uso de memoria RAG

## 🧪 Testing

### Casos de Prueba

1. ✅ Grabar audio de 5 segundos → Transcribir → Guardar
2. ✅ Cancelar durante grabación
3. ✅ Transcribir con API caída (error handling)
4. ✅ Editar transcripción antes de guardar
5. ✅ Reproducir audio múltiples veces
6. ✅ Grabar múltiples notas en secuencia

## 📚 Referencias

- [ElevenLabs Speech-to-Text API](https://elevenlabs.io/docs)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [RAG Memory System](../services/rag_memory/README.md)

## 🤝 Contribuir

Para agregar funcionalidades:

1. Mantén el archivo bajo 300 líneas (regla del proyecto)
2. Usa constantes en lugar de valores hardcoded
3. Documenta cambios en este archivo
4. Actualiza los tipos TypeScript
5. Agrega tests si es posible

---

**Última actualización**: Noviembre 22, 2025
**Versión**: 1.0.0
**Autor**: Sistema de Integración RAG

