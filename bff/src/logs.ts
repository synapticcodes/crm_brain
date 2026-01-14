import { supabaseAdmin } from './supabaseAdmin.js';

export async function insertLog(params: {
  tenancyId: string;
  actorUserId: string;
  actorEmail: string | null;
  action: string;
  stage: string;
  details?: Record<string, unknown>;
  clienteId?: string | null;
}) {
  const { tenancyId, actorUserId, actorEmail, action, stage, details, clienteId } = params;

  const payload = {
    tenancy_id: tenancyId,
    actor_user_id: actorUserId,
    actor_email: actorEmail,
    action,
    stage,
    details: details ?? {},
    cliente_id: clienteId ?? null
  };

  const { error } = await supabaseAdmin
    .schema('brain')
    .from('logs')
    .insert(payload);

  if (error) {
    console.error('Failed to write log', error.message);
  }
}
