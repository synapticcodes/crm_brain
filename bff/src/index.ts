import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requireAuth, requireAdmin, type AuthContext } from './auth.js';
import { supabaseAdmin } from './supabaseAdmin.js';
import { createMailer } from './mailer.js';
import { insertLog } from './logs.js';
import { exportChatThread } from './exportChat.js';

dotenv.config();

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || 'http://127.0.0.1:5173';

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

function getAuthContext(res: express.Response) {
  return res.locals.auth as AuthContext;
}

app.post('/admin/invite', requireAuth, requireAdmin, async (req, res) => {
  const { email, role, tenancy_id, full_name, password } = req.body || {};

  if (!email || !role || !tenancy_id) {
    return res.status(400).json({ error: 'email, role, and tenancy_id are required' });
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

const port = Number(process.env.PORT || '8080');

app.listen(port, () => {
  console.log(`BFF listening on http://127.0.0.1:${port}`);
});
