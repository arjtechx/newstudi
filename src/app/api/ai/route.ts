import { NextRequest, NextResponse } from 'next/server';

// ─── In-memory response cache ─────────────────────────────────────────────────
const cache = new Map<string, { response: string; ts: number }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 min

function cacheKey(provider: string, model: string, prompt: string) {
  // Hash simples sem Buffer para evitar problemas de ambiente
  const hash = `${prompt.length}-${prompt.slice(0, 32)}`;
  return `${provider}:${model}:${hash}`;
}

// ─── Provider call implementations ───────────────────────────────────────────

async function callGroq(apiKey: string, model: string, messages: any[]) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1024 }),
  });
  if (!res.ok) throw new Error(`Groq error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callOpenRouter(apiKey: string, model: string, messages: any[]) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://newstudi.app',
      'X-Title': 'NewStudi'
    },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1024 }),
  });
  if (!res.ok) throw new Error(`OpenRouter error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callGemini(apiKey: string, model: string, messages: any[]) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callCloudflare(apiKey: string, model: string, messages: any[]) {
  const [accountId, token] = apiKey.split('|');
  if (!accountId || !token) throw new Error('Cloudflare: apiKey deve ser "accountId|apiToken"');

  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(`Cloudflare error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.result?.response ?? '';
}

async function callHuggingFace(apiKey: string, model: string, messages: any[]) {
  const lastUser = messages.filter(m => m.role === 'user').pop()?.content ?? '';
  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: lastUser, options: { wait_for_model: true } }),
  });
  if (!res.ok) throw new Error(`HuggingFace error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (Array.isArray(data)) return data[0]?.generated_text ?? '';
  return data?.generated_text ?? JSON.stringify(data);
}

// ─── HANDLERS ────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'cache_stats') {
    const now = Date.now();
    const valid = [...cache.values()].filter(v => now - v.ts < CACHE_TTL_MS).length;
    return NextResponse.json({ total: cache.size, valid, ttlMinutes: 30 });
  }

  return NextResponse.json({ status: 'AI Gateway online', cacheSize: cache.size, time: new Date().toISOString() });
}

export async function POST(req: NextRequest) {
  console.log(`[AI API] Request POST received`);
  
  try {
    const body = await req.json();
    const { provider, apiKey, model, messages, systemPrompt, useCache = true } = body;

    if (!provider || !apiKey || !model || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    const fullMessages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    const ck = cacheKey(provider, model, JSON.stringify(fullMessages));
    if (useCache && cache.has(ck)) {
      const cached = cache.get(ck)!;
      if (Date.now() - cached.ts < CACHE_TTL_MS) {
        return NextResponse.json({ response: cached.response, fromCache: true });
      }
      cache.delete(ck);
    }

    let response = '';
    switch (provider) {
      case 'groq':        response = await callGroq(apiKey, model, fullMessages); break;
      case 'openrouter':  response = await callOpenRouter(apiKey, model, fullMessages); break;
      case 'gemini':      response = await callGemini(apiKey, model, fullMessages); break;
      case 'cloudflare':  response = await callCloudflare(apiKey, model, fullMessages); break;
      case 'huggingface': response = await callHuggingFace(apiKey, model, fullMessages); break;
      default:
        throw new Error(`Provedor desconhecido: ${provider}`);
    }

    if (useCache) cache.set(ck, { response, ts: Date.now() });
    return NextResponse.json({ response, fromCache: false });

  } catch (e: any) {
    console.error(`[AI API ERROR]`, e.message);
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
