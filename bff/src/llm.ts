import OpenAI from 'openai';

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text
  });
  return response.data[0]?.embedding ?? [];
}

export async function summarizeThread(params: {
  mode: 'short' | 'long';
  previousSummary?: string | null;
  messages: string[];
}): Promise<string> {
  const system = params.mode === 'short'
    ? 'Voce e um assistente de atendimento. Gere um resumo curto (5-8 linhas), direto e objetivo.'
    : 'Voce e um assistente de atendimento. Gere um resumo detalhado (1-2 paragrafos) com contexto, pendencias e proximos passos.';
  const user = [
    'Resumo anterior:',
    params.previousSummary || 'Sem resumo.',
    '',
    'Mensagens recentes:',
    params.messages.join('\n')
  ].join('\n');

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.2,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  });

  return completion.choices[0]?.message?.content?.trim() || '';
}

export async function suggestReply(params: {
  summary?: string | null;
  messages: string[];
  userInput?: string | null;
}): Promise<string> {
  const system =
    'Voce e um assistente de atendimento. Sugira uma resposta curta, clara e educada. Nao invente fatos.';
  const user = [
    params.summary ? `Resumo:\n${params.summary}\n` : '',
    'Mensagens recentes:',
    params.messages.join('\n'),
    '',
    params.userInput ? `Pedido do atendente: ${params.userInput}` : ''
  ]
    .filter(Boolean)
    .join('\n');

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.2,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  });

  return completion.choices[0]?.message?.content?.trim() || '';
}

export async function runPrompt(systemPrompt: string, userPrompt: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.2,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  });

  return completion.choices[0]?.message?.content?.trim() || '';
}
