import bcrypt from 'bcrypt';
import prisma from '../database/client';
import { auditService } from './audit.service';
import { ShiftHoursDefaultsInput } from '../validation/tip.schema';

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

/** Switch a venue's support-staff split behavior (POOLED: shared role %; PER_PERSON: each support worker gets the full role %). */
export async function setSupportSplitMode(slug: string, mode: 'POOLED' | 'PER_PERSON') {
  return (prisma as any).tenant.update({ where: { slug }, data: { supportSplitMode: mode } });
}

const SHIFT_HOURS_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const shiftHoursColumn = (day: (typeof SHIFT_HOURS_DAYS)[number]) => `shiftHours${day[0].toUpperCase()}${day.slice(1)}`;

/** A venue's support-split mode plus its day-of-week "Total Shift Hours" defaults (used to auto-fill the tip entry form). */
export async function getShiftHoursConfig(tenantId: string) {
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId } });
  const defaults = Object.fromEntries(SHIFT_HOURS_DAYS.map((day) => [day, tenant[shiftHoursColumn(day)] ?? null]));
  return { supportSplitMode: tenant.supportSplitMode as 'POOLED' | 'PER_PERSON', defaults };
}

export async function setShiftHoursDefaults(tenantId: string, defaults: ShiftHoursDefaultsInput) {
  const data = Object.fromEntries(SHIFT_HOURS_DAYS.map((day) => [shiftHoursColumn(day), defaults[day]]));
  await (prisma as any).tenant.update({ where: { id: tenantId }, data });
  await auditService.log({ tenantId, entityType: 'SHIFT_HOURS_CONFIG', entityId: tenantId, action: 'UPDATE', newValues: defaults });
  return getShiftHoursConfig(tenantId);
}
