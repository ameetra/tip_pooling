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

/**
 * Provision a venue: upsert the tenant by slug and its first ADMIN.
 * Reused by the `provision` Lambda action (M14) and the super-admin console (M15).
 * Admin is flagged mustChangePassword=true so the temp password is one-time (M13).
 */
export async function createTenant(input: CreateTenantInput) {
  const tenant = await (prisma as any).tenant.upsert({
    where: { slug: input.slug },
    update: { name: input.name, logoUrl: input.logoUrl ?? null },
    create: {
      slug: input.slug,
      name: input.name,
      logoUrl: input.logoUrl ?? null,
      timezone: input.timezone ?? 'America/Los_Angeles',
    },
  });

  const passwordHash = await bcrypt.hash(input.adminPassword, 10);
  await (prisma as any).user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: input.adminEmail.toLowerCase() } },
    update: { passwordHash, role: 'ADMIN', isActive: true, mustChangePassword: true },
    create: {
      tenantId: tenant.id,
      email: input.adminEmail.toLowerCase(),
      passwordHash,
      role: 'ADMIN',
      mustChangePassword: true,
    },
  });

  return { id: tenant.id, slug: tenant.slug, name: tenant.name };
}
