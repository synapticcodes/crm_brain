import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requireAuth, requireAdmin, type AuthContext } from './auth.js';
import { supabaseAdmin } from './supabaseAdmin.js';
import { createMailer } from './mailer.js';
import { insertLog } from './logs.js';
import { exportChatThread } from './exportChat.js';
import { embedText, summarizeThread, suggestReply, runPrompt } from './llm.js';

dotenv.config();

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || 'http://127.0.0.1:5173';
const allowedOrigins = [corsOrigin, 'http://localhost:5173'];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

function getAuthContext(res: express.Response) {
  return res.locals.auth as AuthContext;
}

async function fetchPrompt(tenancyId: string, assistantKey: string, action: string) {
  const { data } = await supabaseAdmin
    .schema('brain')
    .from('assistant_prompts')
    .select('system_prompt, user_template, output_schema')
    .eq('tenancy_id', tenancyId)
    .eq('assistant_key', assistantKey)
    .eq('action', action)
    .maybeSingle();

  if (!data) return null;
  return data;
}

function renderTemplate(template: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce((acc, [key, value]) => {
    const token = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    return acc.replace(token, value);
  }, template);
}

app.post('/admin/invite', requireAuth, requireAdmin, async (req, res) => {
  const { email, role, tenancy_id, full_name, password } = req.body || {};

  if (!email || !role || !tenancy_id) {
    return res.status(400).json({ error: 'email, role, and tenancy_id are required' });
  }

  if (role !== 'admin' && role !== 'administrativo') {
    return res.status(400).json({ error: 'role must be admin or administrativo' });
  }

  const context = getAuthContext(res);

  if (tenancy_id !== context.tenancyId) {
    return res.status(403).json({ error: 'Tenant mismatch' });
  }

  try {
    let userId: string | undefined;

    if (password) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (error || !data.user) {
        return res.status(400).json({ error: error?.message || 'Failed to create user' });
      }

      userId = data.user.id;
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

      if (error || !data.user) {
        return res.status(400).json({ error: error?.message || 'Failed to invite user' });
      }

      userId = data.user.id;
    }

    const fallbackName = typeof full_name === 'string' && full_name.trim()
      ? full_name.trim()
      : email.split('@')[0];

    const { data: equipe, error: equipeError } = await supabaseAdmin
      .schema('brain')
      .from('equipe')
      .insert({
        auth_user_id: userId,
        tenancy_id,
        full_name: fallbackName,
        email,
        role,
        status: 'pendente'
      })
      .select('id')
      .single();

    if (equipeError) {
      return res.status(400).json({ error: equipeError.message });
    }

    await insertLog({
      tenancyId: context.tenancyId,
      actorUserId: context.equipeId,
      actorEmail: context.email,
      action: 'admin_invite',
      stage: 'team',
      details: {
        invited_email: email,
        invited_role: role,
        invited_user_id: userId
      }
    });

    return res.json({ ok: true, auth_user_id: userId, equipe_id: equipe.id });
  } catch (error) {
    return res.status(500).json({ error: 'Invite failed' });
  }
});

app.post('/admin/disable', requireAuth, requireAdmin, async (req, res) => {
  const { auth_user_id, reason, ip } = req.body || {};

  if (!auth_user_id || !reason) {
    return res.status(400).json({ error: 'auth_user_id and reason are required' });
  }

  const context = getAuthContext(res);

  try {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(auth_user_id, {
      ban_duration: '87600h'
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const { data: equipe, error: equipeError } = await supabaseAdmin
      .schema('brain')
      .from('equipe')
      .select('id, email, tenancy_id')
      .eq('auth_user_id', auth_user_id)
      .maybeSingle();

    if (equipeError || !equipe) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    if (equipe.tenancy_id !== context.tenancyId) {
      return res.status(403).json({ error: 'Tenant mismatch' });
    }

    const { error: updateError } = await supabaseAdmin
      .schema('brain')
      .from('equipe')
      .update({
        status: 'offline'
      })
      .eq('id', equipe.id);

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    if (ip) {
      const { error: ipError } = await supabaseAdmin
        .schema('brain')
        .from('ip_blacklist')
        .upsert({
          tenancy_id: context.tenancyId,
          ip,
          reason
        }, { onConflict: 'tenancy_id,ip' });

      if (ipError) {
        return res.status(400).json({ error: ipError.message });
      }
    }

    await insertLog({
      tenancyId: context.tenancyId,
      actorUserId: context.equipeId,
      actorEmail: context.email,
      action: 'admin_disable',
      stage: 'team',
      details: {
        disabled_user_id: auth_user_id,
        reason,
        ip
      }
    });

    return res.json({ ok: true, disabled_user_id: auth_user_id, equipe_id: equipe.id });
  } catch (error) {
    return res.status(500).json({ error: 'Disable failed' });
  }
});

app.post('/mail/send', requireAuth, async (req, res) => {
  const { to, subject, body_text, body_html, cliente_id } = req.body || {};

  if (!to || !subject || !body_text) {
    return res.status(400).json({ error: 'to, subject, and body_text are required' });
  }

  const context = getAuthContext(res);
  const { transporter, from } = createMailer();

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      text: body_text,
      html: body_html
    });

    const { error: insertError } = await supabaseAdmin
      .schema('brain')
      .from('emails_mensagens')
      .insert({
        tenancy_id: context.tenancyId,
        cliente_id: cliente_id || null,
        thread_key: to,
        direction: 'equipe',
        from_address: from,
        to_address: to,
        subject,
        body_html: body_html || null,
        body_text: body_text,
        status: 'enviado'
      });

    if (insertError) {
      return res.status(400).json({ error: insertError.message });
    }

    await insertLog({
      tenancyId: context.tenancyId,
      actorUserId: context.equipeId,
      actorEmail: context.email,
      action: 'mail_send',
      stage: 'support',
      details: {
        to,
        subject
      },
      clienteId: cliente_id || null
    });

    return res.json({ ok: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await supabaseAdmin
      .schema('brain')
      .from('emails_mensagens')
      .insert({
        tenancy_id: context.tenancyId,
        cliente_id: cliente_id || null,
        thread_key: to,
        direction: 'equipe',
        from_address: from,
        to_address: to,
        subject,
        body_html: body_html || null,
        body_text: body_text,
        status: 'erro',
        error_msg: errorMessage
      });

    await insertLog({
      tenancyId: context.tenancyId,
      actorUserId: context.equipeId,
      actorEmail: context.email,
      action: 'mail_send_failed',
      stage: 'support',
      details: {
        to,
        subject,
        error: errorMessage
      },
      clienteId: cliente_id || null
    });

    return res.status(500).json({ error: 'Email send failed' });
  }
});

app.get('/chat/:thread_id/export.txt', requireAuth, async (req, res) => {
  const { thread_id } = req.params;
  const context = getAuthContext(res);

  try {
    const transcript = await exportChatThread({
      threadId: thread_id,
      tenancyId: context.tenancyId
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="chat-${thread_id}.txt"`);

    return res.send(transcript);
  } catch (error) {
    return res.status(404).json({ error: 'Chat export failed' });
  }
});

app.post('/chat/assist', requireAuth, async (req, res) => {
  const { thread_id, action, query, tone } = req.body || {};

  if (!thread_id || !action) {
    return res.status(400).json({ error: 'thread_id and action are required' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });
  }

  const context = getAuthContext(res);

  const { data: thread, error: threadError } = await supabaseAdmin
    .schema('brain')
    .from('chat_threads')
    .select('id, tenancy_id, summary_short, summary_long')
    .eq('id', thread_id)
    .eq('tenancy_id', context.tenancyId)
    .single();

  if (threadError || !thread) {
    return res.status(404).json({ error: 'Chat thread not found' });
  }

  const { data: messages, error: messagesError } = await supabaseAdmin
    .schema('brain')
    .from('chat_mensagens')
    .select('id, direction, body, created_at')
    .eq('thread_id', thread_id)
    .eq('tenancy_id', context.tenancyId)
    .order('created_at', { ascending: true })
    .limit(120);

  if (messagesError) {
    return res.status(400).json({ error: messagesError.message });
  }

  const formattedMessages = (messages || [])
    .filter((msg) => typeof msg.body === 'string' && msg.body.trim().length > 0)
    .map((msg) => `${msg.direction}: ${msg.body}`);

  const messageIds = (messages || []).map((msg) => msg.id);
  const { data: existingEmbeddings } = await supabaseAdmin
    .schema('brain')
    .from('chat_embeddings')
    .select('message_id')
    .in('message_id', messageIds);

  const existingIds = new Set((existingEmbeddings || []).map((row) => row.message_id));
  const missingMessages = (messages || []).filter(
    (msg) => msg.body && msg.body.trim().length > 0 && !existingIds.has(msg.id)
  );

  for (const msg of missingMessages) {
    const content = `${msg.direction}: ${msg.body}`;
    const embedding = await embedText(content);
    if (embedding.length === 0) continue;
    await supabaseAdmin
      .schema('brain')
      .from('chat_embeddings')
      .insert({
        tenancy_id: context.tenancyId,
        thread_id,
        message_id: msg.id,
        role: 'message',
        content,
        embedding
      });
  }

  if (action === 'summary_short' || action === 'summary_long') {
    const prompt = await fetchPrompt(context.tenancyId, 'chat', action);
    let summary = '';
    if (prompt) {
      const userPrompt = renderTemplate(prompt.user_template, {
        messages: formattedMessages.slice(-60).join('\n'),
        summary: action === 'summary_short' ? thread.summary_short || '' : thread.summary_long || ''
      });
      summary = await runPrompt(prompt.system_prompt, userPrompt);
    } else {
      summary = await summarizeThread({
        mode: action === 'summary_short' ? 'short' : 'long',
        previousSummary: action === 'summary_short' ? thread.summary_short : thread.summary_long,
        messages: formattedMessages.slice(-60)
      });
    }

    const updates =
      action === 'summary_short' ? { summary_short: summary } : { summary_long: summary };

    await supabaseAdmin
      .schema('brain')
      .from('chat_threads')
      .update(updates)
      .eq('id', thread_id)
      .eq('tenancy_id', context.tenancyId);

    return res.json({ summary });
  }

  if (action === 'suggest_reply') {
    const prompt = await fetchPrompt(context.tenancyId, 'chat', action);
    let suggestion = '';
    if (prompt) {
      const userPrompt = renderTemplate(prompt.user_template, {
        messages: formattedMessages.slice(-40).join('\n'),
        query: typeof query === 'string' ? query : '',
        tone: typeof tone === 'string' ? tone : ''
      });
      suggestion = await runPrompt(prompt.system_prompt, userPrompt);
    } else {
      const summary = thread.summary_short || thread.summary_long || null;
      suggestion = await suggestReply({
        summary,
        messages: formattedMessages.slice(-40),
        userInput: typeof query === 'string' ? query : null
      });
    }
    return res.json({ suggestion });
  }

  if (action === 'search') {
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query is required for search' });
    }

    const queryEmbedding = await embedText(query);
    if (queryEmbedding.length === 0) {
      return res.status(500).json({ error: 'Failed to embed query' });
    }

    const { data: results, error: searchError } = await supabaseAdmin.rpc('match_chat_embeddings', {
      query_embedding: queryEmbedding,
      match_count: 8,
      filter_tenancy: context.tenancyId,
      filter_thread: thread_id
    });

    if (searchError) {
      return res.status(400).json({ error: searchError.message });
    }

    return res.json({ results });
  }

  return res.status(400).json({ error: 'Unknown action' });
});

app.post('/team/assist', requireAuth, requireAdmin, async (req, res) => {
  const { action, query, member, metrics, team } = req.body || {};

  if (!action) {
    return res.status(400).json({ error: 'action is required' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });
  }

  if (action === 'custom' && (!query || typeof query !== 'string')) {
    return res.status(400).json({ error: 'query is required for custom' });
  }

  try {
    const prompt = await fetchPrompt(getAuthContext(res).tenancyId, 'team', action);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not configured' });
    }

    const userPrompt = renderTemplate(prompt.user_template, {
      query: typeof query === 'string' ? query : '',
      member: JSON.stringify(member || {}),
      metrics: JSON.stringify(metrics || {}),
      team: JSON.stringify(team || [])
    });

    const response = await runPrompt(prompt.system_prompt, userPrompt);
    return res.json({ response: response || 'Sem resposta.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to generate assistant response' });
  }
});

app.post('/prompts/preview', requireAuth, requireAdmin, async (req, res) => {
  const { system_prompt, user_template, variables } = req.body || {};

  if (!system_prompt || !user_template) {
    return res.status(400).json({ error: 'system_prompt and user_template are required' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });
  }

  const safeVars = typeof variables === 'object' && variables ? variables : {};
  const userPrompt = renderTemplate(user_template, safeVars);

  try {
    const response = await runPrompt(system_prompt, userPrompt);
    return res.json({ response: response || 'Sem resposta.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to generate preview response' });
  }
});

app.post('/email/assist', requireAuth, async (req, res) => {
  const { action, subject, body, goal, tone, received_subject, received_body, received_from } = req.body || {};

  if (!action) {
    return res.status(400).json({ error: 'action is required' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });
  }

  const context = getAuthContext(res);
  const prompt = await fetchPrompt(context.tenancyId, 'email', action);
  if (!prompt) {
    return res.status(404).json({ error: 'Prompt not configured' });
  }

  const userPrompt = renderTemplate(prompt.user_template, {
    subject: typeof subject === 'string' ? subject : '',
    body: typeof body === 'string' ? body : '',
    goal: typeof goal === 'string' ? goal : '',
    tone: typeof tone === 'string' ? tone : '',
    received_subject: typeof received_subject === 'string' ? received_subject : '',
    received_body: typeof received_body === 'string' ? received_body : '',
    received_from: typeof received_from === 'string' ? received_from : ''
  });

  try {
    const responseText = await runPrompt(prompt.system_prompt, userPrompt);
    let parsed: { subject?: string; body?: string } | null = null;

    const cleaned = responseText.replace(/```json|```/gi, '').trim();
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = null;
    }

    if (!parsed) {
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end > start) {
        try {
          parsed = JSON.parse(cleaned.slice(start, end + 1));
        } catch {
          parsed = null;
        }
      }
    }

    if (parsed && (parsed.subject || parsed.body)) {
      return res.json({
        subject: parsed.subject || '',
        body: parsed.body || ''
      });
    }

    return res.json({
      subject: typeof subject === 'string' ? subject : '',
      body: responseText || ''
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to generate email assistant response' });
  }
});

const port = Number(process.env.PORT || '8080');

app.listen(port, () => {
  console.log(`BFF listening on http://127.0.0.1:${port}`);
});
