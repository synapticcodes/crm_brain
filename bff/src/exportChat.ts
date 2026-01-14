import { supabaseAdmin } from './supabaseAdmin.js';

export async function exportChatThread(params: {
  threadId: string;
  tenancyId: string;
}) {
  const { threadId, tenancyId } = params;

  const { data: thread, error: threadError } = await supabaseAdmin
    .schema('brain')
    .from('chat_threads')
    .select('id, protocolo, cliente_id, created_at')
    .eq('id', threadId)
    .eq('tenancy_id', tenancyId)
    .maybeSingle();

  if (threadError || !thread) {
    throw new Error('Thread not found');
  }

  const { data: messages, error: messagesError } = await supabaseAdmin
    .schema('brain')
    .from('chat_mensagens')
    .select('created_at, direction, from_name, to_name, body')
    .eq('thread_id', threadId)
    .eq('tenancy_id', tenancyId)
    .order('created_at', { ascending: true });

  if (messagesError) {
    throw new Error('Failed to load messages');
  }

  const headerLines = [
    `Thread: ${thread.protocolo || thread.id}`,
    `Cliente: ${thread.cliente_id}`,
    `Criado em: ${thread.created_at}`,
    '---'
  ];

  const bodyLines = (messages || []).map((message) => {
    const timestamp = message.created_at || '';
    const from = message.from_name || message.direction || 'unknown';
    const to = message.to_name ? ` -> ${message.to_name}` : '';
    const text = message.body || '';
    return `[${timestamp}] ${from}${to}: ${text}`;
  });

  return [...headerLines, ...bodyLines].join('\n');
}
