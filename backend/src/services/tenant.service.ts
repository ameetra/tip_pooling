import bcrypt from 'bcrypt';
import prisma from '../database/client';

export interface Branding {
  slug: string;
  name: string;
  logoUrl: string | null;
}

export async function getTenantBySlug(slug: string) {
  return (prisma as any).tenant.findUnique({ where: { slug } });
}

export async function getBranding(slug: string): Promise<Branding | null> {
  const t = await getTenantBySlug(slug);
  return t ? { slug: t.slug, name: t.name, logoUrl: t.logoUrl ?? null } : null;
}

export async function listBranding(): Promise<Branding[]> {
  const tenants = await (prisma as any).tenant.findMany({
    where: { slug: { not: null } },
    select: { slug: true, name: true, logoUrl: true },
    orderBy: { name: 'asc' },
  });
  return tenants;
}

export interface CreateTenantInput {
  slug: string;
  name: string;
  logoUrl?: string | null;
  timezone?: string;
  adminEmail: string;
  adminPassword: string;
}

export async function upsertTenant(input: { slug: string; name: string; logoUrl?: string | null; timezone?: string }) {
  return (prisma as any).tenant.upsert({
    where: { slug: input.slug },
    update: { name: input.name, logoUrl: input.logoUrl ?? null },
    create: {
      slug: input.slug,
      name: input.name,
      logoUrl: input.logoUrl ?? null,
      timezone: input.timezone ?? 'America/Los_Angeles',
    },
  });
}

/** Upsert an ADMIN for a venue. mustChangePassword=true → the temp password is one-time (M13). */
export async function upsertVenueAdmin(tenantId: string, email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  await (prisma as any).user.upsert({
    where: { tenantId_email: { tenantId, email: email.toLowerCase() } },
    update: { passwordHash, role: 'ADMIN', isActive: true, mustChangePassword: true },
    create: { tenantId, email: email.toLowerCase(), passwordHash, role: 'ADMIN', mustChangePassword: true },
  });
}

/**
 * Provision a venue with its first ADMIN. Reused by the `provision` Lambda action (M14)
 * and the super-admin console (M15).
 */
export async function createTenant(input: CreateTenantInput) {
  const tenant = await upsertTenant(input);
  await upsertVenueAdmin(tenant.id, input.adminEmail, input.adminPassword);
  return { id: tenant.id, slug: tenant.slug, name: tenant.name };
}
