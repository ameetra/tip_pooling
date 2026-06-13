import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { loginUser, requestMagicLink, verifyMagicLink, changePassword } from '../services/auth.service';

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8).max(128) });
const magicLinkSchema = z.object({ email: z.string().email() });
const changePasswordSchema = z.object({ newPassword: z.string().min(8).max(128) });

export async function handleLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const tenantId = process.env.DEFAULT_TENANT_ID!;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress;
    const result = await loginUser(email, password, tenantId, ip);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleRequestMagicLink(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = magicLinkSchema.parse(req.body);
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress;
    await requestMagicLink(email, ip);
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
