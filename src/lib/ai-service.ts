/**
 * AI Service — multi-provider gateway client helper
 */

import { AIMultiConfig, AIProviderName, AIProviderSlot } from './types';
import { callAIAction } from './ai-actions';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  response: string;
  fromCache: boolean;
  usedProvider?: AIProviderName;
  error?: string;
}

// ─── Provider meta info ───────────────────────────────────────────────────────
export const AI_PROVIDERS: Record<AIProviderName, {
  label: string;
  color: string;
  bgColor: string;
  models: string[];
  defaultModel: string;
  freeLimit: string;
  link: string;
  placeholder: string;
  badge: string;
}> = {
  groq: {
    label: 'Groq',
    color: 'text-orange-600',
    bgColor: 'bg-orange-500',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    defaultModel: 'llama-3.3-70b-versatile',
    freeLimit: '14.400 req/dia',
    link: 'https://console.groq.com/keys',
    placeholder: 'gsk_...',
    badge: '⭐ Recomendado',
    setupNotes: 'Verifique se não atingiu o limite de requisições por minuto (RPM) no console da Groq.',
  },
  openrouter: {
    label: 'OpenRouter',
    color: 'text-violet-600',
    bgColor: 'bg-violet-500',
    models: ['meta-llama/llama-3.3-70b-instruct:free', 'google/gemma-3-27b-it:free', 'mistralai/mistral-7b-instruct:free', 'microsoft/phi-3-mini-128k-instruct:free'],
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    freeLimit: 'Modelos gratuitos ilimitados',
    link: 'https://openrouter.ai/keys',
    placeholder: 'sk-or-...',
    badge: '⭐ Recomendado',
    setupNotes: 'Modelos gratuitos podem estar congestionados. Se falhar, tente um modelo pago ou o Gemini.',
  },
  gemini: {
    label: 'Google Gemini',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    defaultModel: 'gemini-2.0-flash',
    freeLimit: '1.500 req/dia',
    link: 'https://aistudio.google.com/app/apikey',
    placeholder: 'AIza...',
    badge: 'Google',
    setupNotes: 'Certifique-se de que o faturamento (Billing) está configurado no Google Cloud se usar modelos Pro, ou use o plano gratuito no AI Studio.',
  },
  cloudflare: {
    label: 'Cloudflare AI',
    color: 'text-amber-600',
    bgColor: 'bg-amber-500',
    models: ['@cf/meta/llama-3.1-8b-instruct', '@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/mistral/mistral-7b-instruct-v0.1'],
    defaultModel: '@cf/meta/llama-3.1-8b-instruct',
    freeLimit: '10.000 req/dia',
    link: 'https://dash.cloudflare.com/',
    placeholder: 'accountId|apiToken',
    badge: 'Self-hosted',
    setupNotes: 'Requer "Account ID" e um "API Token" com permissão "Workers AI: Read". Ative o Workers AI no seu dashboard.',
  },
  huggingface: {
    label: 'HuggingFace',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500',
    models: ['meta-llama/Meta-Llama-3-8B-Instruct', 'mistralai/Mistral-7B-Instruct-v0.3', 'google/gemma-2-9b-it'],
    defaultModel: 'mistralai/Mistral-7B-Instruct-v0.3',
    freeLimit: '1.000 req/dia',
    link: 'https://huggingface.co/settings/tokens',
    placeholder: 'hf_...',
    badge: 'Open-source',
    setupNotes: 'Use um token tipo "READ". Alguns modelos (Llama 3) exigem que você aceite os termos de uso na página do modelo no HF Hub.',
  },
};

// ─── Provider order for fallback ──────────────────────────────────────────────
export const AI_PROVIDER_ORDER: AIProviderName[] = ['groq', 'openrouter', 'cloudflare', 'gemini', 'huggingface'];

// ─── Default config ───────────────────────────────────────────────────────────
export const DEFAULT_AI_MULTI_CONFIG: AIMultiConfig = {
  defaultProvider: 'none',
  systemPrompt: 'Você é um assistente de estudos especializado em concursos públicos. Seja objetivo, didático e responda em português.',
  fallbackEnabled: true,
  providers: {},
};

// ─── Call a single provider via gateway ──────────────────────────────────────
async function callProvider(
  providerName: AIProviderName,
  slot: AIProviderSlot,
  messages: AIMessage[],
  systemPrompt: string,
  useCache: boolean
): Promise<AIResponse> {
  // Tenta primeiro via Server Action (mais robusto no Next.js 15)
  try {
    const result = await callAIAction(
      providerName,
      slot.apiKey,
      slot.model,
      messages,
      systemPrompt
    );

    if (result.success) {
      return { response: result.response!, fromCache: false, usedProvider: providerName };
    }
    throw new Error(result.error);
  } catch (e: any) {
    console.warn(`[AI ACTION FAIL] Tentando via API Route...`, e.message);
    
    // Fallback para API Route caso a Action falhe
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: providerName,
        apiKey: slot.apiKey,
        model: slot.model,
        messages,
        systemPrompt,
        useCache,
      }),
    });

    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Servidor retornou erro HTML (${res.status}). Verifique se o app precisa de build.`);
    }

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error ?? `HTTP ${res.status}`);
    }

    return { response: data.response, fromCache: data.fromCache, usedProvider: providerName };
  }
}

// ─── Main call with fallback support ─────────────────────────────────────────
export async function callAI(
  config: AIMultiConfig,
  messages: AIMessage[],
  options?: { useCache?: boolean; forceProvider?: AIProviderName }
): Promise<AIResponse> {
  const useCache = options?.useCache ?? true;
  const { defaultProvider, fallbackEnabled, systemPrompt, providers } = config;

  const targetProvider = options?.forceProvider ?? defaultProvider;
  const preferred = targetProvider !== 'none' ? [targetProvider as AIProviderName] : [];
  const fallbacks = fallbackEnabled
    ? AI_PROVIDER_ORDER.filter(p => p !== targetProvider && providers[p]?.enabled)
    : [];
  const order = [...preferred, ...fallbacks];

  let lastError = 'Nenhum provedor de IA configurado ou habilitado.';

  for (const pName of order) {
    const slot = providers[pName];
    if (!slot?.enabled || !slot.model) continue;

    // Normalização em tempo real: se não tem apiKeys mas tem apiKey (legado), converte
    const effectiveKeys = slot.apiKeys && slot.apiKeys.length > 0 
        ? slot.apiKeys 
        : (slot.apiKey ? [slot.apiKey] : []);

    if (effectiveKeys.length === 0) continue;

    // Tentar cada chave disponível para este provedor antes de passar para o fallback
    for (let i = 0; i < effectiveKeys.length; i++) {
        const keyIdx = ((slot.activeKeyIndex || 0) + i) % effectiveKeys.length;
        const currentKey = effectiveKeys[keyIdx];
        if (!currentKey) continue;

        try {
          return await callProvider(pName, { ...slot, apiKey: currentKey } as any, messages, systemPrompt, useCache);
        } catch (e: any) {
          lastError = `[${pName} Key ${keyIdx + 1}] ${e.message}`;
          console.warn(`Chave ${keyIdx + 1} de ${pName} falhou, tentando próxima...`);
        }
    }
    
    if (!fallbackEnabled) break;
  }

  return { response: '', fromCache: false, error: lastError };
}

// ─── Test a single provider slot ─────────────────────────────────────────────
export async function testProviderSlot(
  providerName: AIProviderName,
  slot: AIProviderSlot
): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
  const start = Date.now();
  try {
    const res = await callProvider(
      providerName,
      slot,
      [{ role: 'user', content: 'Responda apenas: "OK"' }],
      '',
      false
    );
    const latencyMs = Date.now() - start;
    return { ok: true, message: `Conectado! Latência: ${latencyMs}ms`, latencyMs };
  } catch (e: any) {
    return { ok: false, message: e.message };
  }
}

// Legacy compat
export { AI_PROVIDERS as AI_PROVIDER_DEFAULTS };
export async function testAIProvider(config: any) {
  if (!config?.provider || !config?.providers) {
    // old format
    return { ok: false, message: 'Formato legado — reconfigure.' };
  }
  const slot = config.providers[config.defaultProvider];
  if (!slot) return { ok: false, message: 'Provedor padrão não configurado.' };
  return testProviderSlot(config.defaultProvider, slot);
}
