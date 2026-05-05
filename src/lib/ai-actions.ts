'use server'

/**
 * Server Action para chamadas de IA.
 * Funciona nativamente no Next.js 15 e evita problemas de 404 de rotas de API.
 */

import { AIMultiConfig, AIProviderName, AIProviderSlot } from './types';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function callAIAction(
  provider: AIProviderName,
  apiKey: string,
  model: string,
  messages: AIMessage[],
  systemPrompt: string
) {
  console.log(`[AI ACTION] Executing for ${provider}...`);

  const fullMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  try {
    let response = '';

    if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: fullMessages, temperature: 0.7 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `Groq Error ${res.status}`);
      response = data.choices?.[0]?.message?.content ?? '';
    } 
    else if (provider === 'gemini') {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const contents = fullMessages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `Gemini Error ${res.status}`);
      response = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    }
    else if (provider === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://newstudi.app',
        },
        body: JSON.stringify({ model, messages: fullMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `OpenRouter Error ${res.status}`);
      response = data.choices?.[0]?.message?.content ?? '';
    }
    else if (provider === 'cloudflare') {
      const [accountId, token] = apiKey.split('|');
      if (!accountId || !token) throw new Error('Formato Cloudflare inválido. Use accountId|apiToken');
      
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: fullMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.errors?.[0]?.message || `Cloudflare Error ${res.status}`);
      response = data.result?.response ?? '';
    }
    else if (provider === 'huggingface') {
      const lastUser = fullMessages.filter(m => m.role === 'user').pop()?.content ?? '';
      const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: lastUser, options: { wait_for_model: true } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HuggingFace Error ${res.status}`);
      response = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
    }

    if (!response && provider !== 'huggingface') {
       throw new Error('A IA retornou uma resposta vazia. Verifique sua cota ou se o modelo está ativo.');
    }

    return { success: true, response };
  } catch (e: any) {
    console.error(`[AI ACTION ERROR]`, e.message);
    return { success: false, error: e.message };
  }
}
