import { openai } from '@ai-sdk/openai';
import { generateText, streamText } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';


type ProcessRequest = {
  text: string;
  category?: string | null;
  source?: string | null;
  force_action?: 'save' | 'ask' | null;
};

const RAG_API_URL =
  process.env.NEXT_PUBLIC_RAG_API_URL || 'http://localhost:8000';

function classifyIntentHeuristic(text: string): 'ask' | 'save' | 'none' {
  const t = text.trim().toLowerCase();
  if (!t) return 'none';
  const questionWords = [
    '¿', 'que', 'qué', 'quien', 'quién', 'cuando', 'cuándo',
    'donde', 'dónde', 'como', 'cómo', 'por qué', 'porque',
    'what', 'who', 'when', 'where', 'how', 'why'
  ];
  const saveWords = [
    'guarda', 'guardar', 'anota', 'anotar', 'recuerda', 'recordar',
    'nota:', 'save', 'remember', 'note:'
  ];
  if (t.includes('?') || questionWords.some(w => t.startsWith(w))) {
    return 'ask';
  }
  if (saveWords.some(w => t.includes(w))) {
    return 'save';
  }
  // Por defecto, actuar como asistente conversacional (ask)
  return 'ask';
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ProcessRequest;
    const text = (body.text || '').trim();
    if (!text) {
      return NextResponse.json(
        { error: 'Text cannot be empty' },
        { status: 400 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured on server' },
        { status: 500 },
      );
    }

    const url = new URL(req.url);
    const wantStream =
      url.searchParams.get('stream') === '1' ||
      url.searchParams.get('stream') === 'true';

    // Allow explicit override
    if (body.force_action === 'save') {
      const memory = await saveMemory({
        text,
        category: body.category || undefined,
        source: body.source || undefined,
      });
      return NextResponse.json({
        action: 'saved',
        intent: 'save',
        decider: 'override',
        memory,
      });
    }
    if (body.force_action === 'ask') {
      if (wantStream) {
        return streamAnswerWithRag({
          text,
          category: body.category || undefined,
          needsCitation: false,
        });
      } else {
        const { results, answer } = await answerWithRag({
          text,
          category: body.category || undefined,
        });
        return NextResponse.json({
          action: 'answered',
          intent: 'ask',
          decider: 'override',
          answer,
          sources: results,
        });
      }
    }

    // Heurística previa: sesgar a conversación/consulta salvo pedido explícito de guardado
    const pre = classifyIntentHeuristic(text);
    if (pre === 'save') {
      const memory = await saveMemory({
        text,
        category: body.category || 'chat_note',
        source: body.source || 'web_chat',
      });
      return NextResponse.json({
        action: 'saved',
        intent: 'save',
        decider: 'heuristic',
        memory,
      });
    }
    if (pre === 'ask') {
      if (wantStream) {
        return streamAnswerWithRag({
          text,
          category: body.category || 'chat_note',
          needsCitation: false,
        });
      } else {
        const { results, answer } = await answerWithRag({
          text,
          category: body.category || 'chat_note',
        });
        return NextResponse.json({
          action: 'answered',
          intent: 'ask',
          decider: 'heuristic',
          answer,
          sources: results,
        });
      }
    }

    // Tool-calling (AI SDK) - decide only; we execute below
    const tools = {
      save_memory: {
        description:
          'Guardar el texto del usuario como una nueva memoria persistente.',
        // gpt-5 exige que "required" incluya todas las keys en properties.
        // Hacemos ambas requeridas para cumplir con el validador del modelo.
        parameters: z.object({
          category: z.string(),
          source: z.string(),
        }),
      },
      answer_question: {
        description:
          'Responder a la consulta del usuario usando RAG y devolver respuesta breve.',
        // También requerimos needs_citation para cumplir con el validador.
        parameters: z.object({
          needs_citation: z.boolean(),
        }),
      },
    } as const;

    const { toolCalls } = await generateText({
      model: openai('gpt-5'),
      // Only choose between tools; do not produce direct text
      system: [
        "Eres un enrutador de intención para un asistente RAG conversacional.",
        "Elige exactamente una: 'save_memory' o 'answer_question'. No respondas directamente.",
        "Criterios:",
        "- Si el usuario hace una pregunta (¿?, interrogativos) → answer_question.",
        "- Si pide explícitamente guardar/recordar/anotar → save_memory.",
        "- En caso ambiguo, prioriza answer_question (interfaz conversacional).",
        "Proporciona argumentos válidos para la herramienta elegida.",
      ].join('\\n'),
      prompt: text,
      tools,
      toolChoice: 'required',
      temperature: 0,
      maxTokens: 64,
    });

    // Get first tool call decision
    const call = toolCalls[0] as
      | { toolName: 'save_memory'; args?: { category: string; source: string } }
      | { toolName: 'answer_question'; args?: { needs_citation: boolean } }
      | undefined;

    if (call?.toolName === 'save_memory') {
      const memory = await saveMemory({
        text,
        category: call.args?.category ?? body.category ?? undefined,
        source: call.args?.source ?? body.source ?? undefined,
      });
      return NextResponse.json({
        action: 'saved',
        intent: 'save',
        decider: 'tool_calling',
        memory,
      });
    }

    if (call?.toolName === 'answer_question') {
      if (wantStream) {
        return streamAnswerWithRag({
          text,
          category: body.category ?? 'chat_note',
          needsCitation: call.args?.needs_citation ?? false,
        });
      } else {
        const { results, answer } = await answerWithRag({
          text,
          category: body.category ?? 'chat_note',
          needsCitation: call.args?.needs_citation ?? false,
        });
        return NextResponse.json({
          action: 'answered',
          intent: 'ask',
          decider: 'tool_calling',
          answer,
          sources: results,
        });
      }
    }

    // Fallback to save
    const memory = await saveMemory({
      text,
      category: body.category || undefined,
      source: body.source || undefined,
    });
    return NextResponse.json({
      action: 'saved',
      intent: 'save',
      decider: 'fallback',
      memory,
    });
  } catch (err) {
    console.error('process route error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function streamAnswerWithRag(input: {
  text: string;
  category?: string;
  needsCitation?: boolean;
}) {
  return (async () => {
    // Retrieve first
    const params = new URLSearchParams({
      query: input.text,
      limit: '5',
    });
    if (input.category) params.set('category', input.category);
    const res = await fetch(`${RAG_API_URL}/search?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`RAG /search error: ${res.status} - ${t}`);
    }
    const search = (await res.json()) as Array<{
      memory: { id: number; text: string; category?: string; source?: string };
      similarity_score: number;
    }>;
    const top = search.slice(0, 3);
    const context = top
      .map((r) => `- [id ${r.memory.id}] ${r.memory.text.slice(0, 600)}`)
      .join('\n');

    // Stream the answer
    const result = await streamText({
      model: openai('gpt-5'),
      system: [
        'Actúa como SecondBrain, el segundo cerebro digital del usuario.',
        'Objetivo: responder usando EXCLUSIVAMENTE el contexto (RAG).',
        'Reglas:',
        '- Idioma: español neutro. Tono claro, profesional y cercano.',
        '- Estilo: breve (2–4 frases), directo. Si hay pasos, usa viñetas.',
        "- No inventes. Si el contexto es insuficiente, dilo y sugiere: “¿Quieres que lo guarde como nota?”",
        '- Si aplica, menciona relaciones o conexiones detectadas en el contexto.',
        '- Cuando corresponda, incluye una mención breve a la fuente entre paréntesis (ej: id o extracto).',
        '- Respeta la privacidad: no uses datos externos ni asumas información.',
      ].join('\n'),
      prompt:
        `Pregunta:\n${input.text}\n\n` +
        `Contexto:\n${context || 'No hay contexto disponible.'}\n\n` +
        `${input.needsCitation ? 'Incluye una mención breve a la fuente.' : ''}`,
      temperature: 0.2,
      maxTokens: 512,
    });
    // Enviar SOLO el texto en streaming (sin eventos), para que el cliente lo muestre limpio
    return new Response(result.textStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  })();
}

async function saveMemory(input: {
  text: string;
  category?: string;
  source?: string;
}) {
  const res = await fetch(`${RAG_API_URL}/memories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: input.text,
      category: input.category,
      source: input.source,
    }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`RAG /memories error: ${res.status} - ${t}`);
  }
  return await res.json();
}

async function answerWithRag(input: {
  text: string;
  category?: string;
  needsCitation?: boolean;
}) {
  // 1) Retrieve
  const params = new URLSearchParams({
    query: input.text,
    limit: '5',
  });
  if (input.category) params.set('category', input.category);
  const res = await fetch(`${RAG_API_URL}/search?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`RAG /search error: ${res.status} - ${t}`);
  }
  const search = (await res.json()) as Array<{
    memory: { id: number; text: string; category?: string; source?: string };
    similarity_score: number;
  }>;

  const top = search.slice(0, 3);
  const context = top
    .map((r) => `- [id ${r.memory.id}] ${r.memory.text.slice(0, 600)}`)
    .join('\n');

  // 2) Answer
  const { text } = await generateText({
    model: openai('gpt-5'),
    system: [
      'Actúa como SecondBrain, el segundo cerebro digital del usuario.',
      'Objetivo: responder usando EXCLUSIVAMENTE el contexto (RAG).',
      'Reglas:',
      '- Idioma: español neutro. Tono claro, profesional y cercano.',
      '- Estilo: breve (2–4 frases), directo. Si hay pasos, usa viñetas.',
      "- No inventes. Si el contexto es insuficiente, dilo y sugiere: “¿Quieres que lo guarde como nota?”",
      '- Si aplica, menciona relaciones o conexiones detectadas en el contexto.',
      '- Cuando corresponda, incluye una mención breve a la fuente entre paréntesis (ej: id o extracto).',
      '- Respeta la privacidad: no uses datos externos ni asumas información.',
    ].join('\n'),
    prompt:
      `Pregunta:\n${input.text}\n\n` +
      `Contexto:\n${context || 'No hay contexto disponible.'}\n\n` +
      `${input.needsCitation ? 'Incluye una mención breve a la fuente.' : ''}`,
    temperature: 0.2,
    maxTokens: 512,
  });

  return {
    results: search.map((r) => ({
      memory: r.memory,
      similarity_score: r.similarity_score,
    })),
    answer: text,
  };
}


