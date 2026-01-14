import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from './supabaseAdmin.js';

export type AuthContext = {
  userId: string;
  email: string | null;
  equipeId: string;
  tenancyId: string;
  role: string;
};

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      return res.status(401).json({ error: 'Missing Authorization token' });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = userData.user;

    const { data: equipe, error: equipeError } = await supabaseAdmin
      .schema('brain')
      .from('equipe')
      .select('id, tenancy_id, role, email')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (equipeError || !equipe) {
      return res.status(403).json({ error: 'User not linked to tenant' });
    }

    const context: AuthContext = {
      userId: user.id,
      email: equipe.email ?? user.email ?? null,
      equipeId: equipe.id,
      tenancyId: equipe.tenancy_id,
      role: equipe.role
    };

    res.locals.auth = context;
    return next();
  } catch (error) {
    return res.status(500).json({ error: 'Auth validation failed' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const context = res.locals.auth as AuthContext | undefined;

  if (!context) {
    return res.status(401).json({ error: 'Missing auth context' });
  }

  if (context.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' });
  }

  return next();
}
