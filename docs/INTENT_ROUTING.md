## Router de Intención (Tool-Calling puro)

### Resumen
- Endpoint único: `POST /process` en `apis/rag_memory/api.py`
- El modelo (OpenAI) elige estrictamente entre dos herramientas:
  - `save_memory`: guardar el texto como memoria en la DB vectorial
  - `answer_question`: consultar el RAG y responder con contexto
- Override opcional desde UI: `force_action: "save" | "ask"`

### Diagrama

```
[Texto / Audio→STT] ──► [/process]
                         │
                         ▼
                 (tool-calling: required)
                 ┌───────────────┬───────────────┐
                 │ save_memory   │ answer_question
                 ▼               ▼
      add_memory(text, cat, src)  search_similar_by_text → LLM(answer)
                 │               │
                 └──────► response JSON ◄────────┘
```

### Contrato
- Request:
```json
{
  "text": "contenido del usuario",
  "category": "opcional",
  "source": "opcional",
  "force_action": "save|ask (opcional)"
}
```
- Response (save):
```json
{
  "action": "saved",
  "intent": "save",
  "decider": "tool_calling|override",
  "memory": { "id": 1, "text": "...", "category": "...", "source": "...", "created_at": "..." }
}
```
- Response (ask):
```json
{
  "action": "answered",
  "intent": "ask",
  "decider": "tool_calling|override",
  "answer": "texto breve",
  "sources": [
    { "memory": { "id": 1, "text": "..." }, "similarity_score": 0.91 }
  ]
}
```

### Notas
- Temperatura 0 y `tool_choice="required"` para decisiones deterministas.
- Si el modelo falla, el servidor hace fallback a `save` para no perder datos.
- El frontend ya envía:
  - Texto directo → `/process`
  - Audio → `/transcribe/direct` → texto → `/process`


