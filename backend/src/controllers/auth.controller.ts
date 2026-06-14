import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { loginUser, requestMagicLink, verifyMagicLink, changePassword } from '../services/auth.service';
import { getTenantBySlug } from '../services/tenant.service';
import { StrongPasswordSchema } from '../validation/user.schema';

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1).max(128), slug: z.string().optional() });
const magicLinkSchema = z.object({ email: z.string().email(), slug: z.string().optional() });
const changePasswordSchema = z.object({ newPassword: StrongPasswordSchema });

const unknownVenue = () => Object.assign(new Error('Unknown establishment.'), { code: 'TENANT_NOT_FOUND' });

// Resolve the venue from its slug; fall back to the demo tenant when no slug (legacy single-tenant URL).
async function resolveTenant(slug?: string) {
  if (!slug) {
    const id = process.env.DEFAULT_TENANT_ID!;
    return { id, slug: null, name: 'Demo Restaurant', logoUrl: null };
  }
  const t = await getTenantBySlug(slug);
  if (!t) throw unknownVenue();
  return { id: t.id, slug: t.slug, name: t.name, logoUrl: t.logoUrl ?? null };
}

export async function handleLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, slug } = loginSchema.parse(req.body);
    const tenant = await resolveTenant(slug);
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress;
    const result = await loginUser(email, password, tenant.id, ip);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleRequestMagicLink(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, slug } = magicLinkSchema.parse(req.body);
    const tenant = await resolveTenant(slug);
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress;
    await requestMagicLink(email, tenant, ip);
    res.json({ success: true, data: { message: 'Sign-in link sent. Check your email.' } });
  } catch (err) {
    next(err);
  }
}

export async function handleChangePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { newPassword } = changePasswordSchema.parse(req.body);
    const result = await changePassword(req.user!.sub, req.tenantId!, newPassword);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleVerifyMagicLink(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.query.token as string;
    if (!token) {
      res.status(400).json({ success: false, error: { code: 'MISSING_TOKEN', message: 'Token is required.' } });
      return;
    }
    const result = await verifyMagicLink(token);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
