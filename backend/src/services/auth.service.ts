import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../database/client';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const APP_URL = process.env.APP_URL || 'https://d3vrbd8qbym3pv.cloudfront.net';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: string;
  email: string;
}

function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export async function loginUser(email: string, password: string, tenantId: string): Promise<{ jwt: string }> {
  const user = await (prisma as any).user.findFirst({
    where: { email: email.toLowerCase(), tenantId, isActive: true },
  });

  // Same error message for missing user or wrong password (no user enumeration)
  const invalid = Object.assign(new Error('Invalid email or password.'), { code: 'INVALID_CREDENTIALS' });
  if (!user) throw invalid;

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw invalid;

  return { jwt: signJwt({ sub: user.id, tenantId: user.tenantId, role: user.role, email: user.email }) };
}

async function checkRateLimit(email: string, ipAddress: string | undefined) {
  const oneHourAgo = new Date(Date.now() - 3600000);

  const emailCount = await (prisma as any).magicLinkToken.count({
    where: { email, createdAt: { gte: oneHourAgo } },
  });
  if (emailCount >= 3) throw Object.assign(new Error('Too many magic link requests for this email. Try again later.'), { code: 'RATE_LIMIT_EMAIL' });

  if (ipAddress) {
    const ipCount = await (prisma as any).magicLinkToken.count({
      where: { ipAddress, createdAt: { gte: oneHourAgo } },
    });
    if (ipCount >= 10) throw Object.assign(new Error('Too many requests from this IP. Try again later.'), { code: 'RATE_LIMIT_IP' });
  }
}

export async function requestMagicLink(email: string, ipAddress?: string) {
  const employee = await (prisma as any).employee.findFirst({
    where: { email: email.toLowerCase(), isActive: true },
  });
  if (!employee) throw Object.assign(new Error('No active employee found with that email.'), { code: 'EMPLOYEE_NOT_FOUND' });

  await checkRateLimit(email.toLowerCase(), ipAddress);

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await (prisma as any).magicLinkToken.create({
    data: { email: email.toLowerCase(), token, expiresAt, ipAddress: ipAddress ?? null },
  });

  const magicLink = `${APP_URL}/auth/verify?token=${token}`;
  console.log(`[MAGIC LINK] ${email} → ${magicLink}`);
}

export async function verifyMagicLink(token: string): Promise<{ jwt: string }> {
  const record = await (prisma as any).magicLinkToken.findUnique({ where: { token } });

  if (!record) throw Object.assign(new Error('Invalid or expired magic link.'), { code: 'INVALID_TOKEN' });
  if (record.isUsed) throw Object.assign(new Error('This magic link has already been used.'), { code: 'TOKEN_USED' });
  if (record.expiresAt < new Date()) throw Object.assign(new Error('This magic link has expired.'), { code: 'TOKEN_EXPIRED' });

  await (prisma as any).magicLinkToken.update({
    where: { token },
    data: { isUsed: true, usedAt: new Date() },
  });

  const employee = await (prisma as any).employee.findFirst({
    where: { email: record.email, isActive: true },
  });
  if (!employee) throw Object.assign(new Error('Employee account no longer active.'), { code: 'EMPLOYEE_NOT_FOUND' });

  return { jwt: signJwt({ sub: employee.id, tenantId: employee.tenantId, role: employee.role, email: employee.email }) };
}

export function verifyJwtToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
