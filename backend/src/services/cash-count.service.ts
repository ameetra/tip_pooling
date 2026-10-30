import prisma from '../database/client';
import { auditService } from './audit.service';
import { tenantToday } from './tenant.service';
import { TipCalculationError } from './tip-calculation.service';
import { CashCountInput, CashCountQuery, CreateCashCountInput } from '../validation/cash-count.schema';
import { samePool } from '../utils/pool-name';

type Performer = { userId: string; email: string } | undefined;
type Tally = Omit<CashCountInput, 'deposit' | 'comments'>;
type CashCount = NonNullable<Awaited<ReturnType<typeof prisma.cashCount.findFirst>>>;

const FACE_VALUES = { bills100: 100, bills50: 50, bills20: 20, bills10: 10, bills5: 5, bills2: 2, bills1: 1 } as const;
const BILLS = Object.keys(FACE_VALUES) as (keyof typeof FACE_VALUES)[];
const DEFAULT_RANGE_DAYS = 14;
// How far back an uncounted drop keeps showing up, so launch day doesn't list all of history.
const UNCOUNTED_LOOKBACK_DAYS = 60;
const AUDITED = ['entryDate', 'poolName', 'expectedAmount', ...BILLS, 'coins', 'countedTotal', 'deposit', 'comments'] as const;

const cents = (n: number) => Math.round(n * 100);

export const countedTotal = (t: Tally) =>
  (BILLS.reduce((sum, k) => sum + t[k] * FACE_VALUES[k] * 100, 0) + cents(t.coins)) / 100;

const daysBefore = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

const auditValues = (c: CashCount) => Object.fromEntries(AUDITED.map((k) => [k, c[k]]));

async function expectedFor(tenantId: string, entryDate: string, poolName: string) {
  const entries = await prisma.tipEntry.findMany({ where: { tenantId, entryDate, isDeleted: false }, select: { poolName: true, cashInRegister: true } });
  return entries.find((e) => samePool(e.poolName, poolName))?.cashInRegister ?? null;
}

const poolKey = (entryDate: string, poolName: string) => `${entryDate}|${poolName.toLowerCase()}`;

function toRow(entryDate: string, poolName: string, currentExpected: number | null, count: CashCount | null) {
  const variance = count ? (cents(count.countedTotal) - cents(count.expectedAmount)) / 100 : null;
  return {
    entryDate,
    poolName,
    currentExpected,
    count,
    variance,
    status: variance === null ? 'NOT_COUNTED' : variance === 0 ? 'MATCHES' : variance < 0 ? 'SHORT' : 'OVER',
    entryChanged: !!count && currentExpected !== null && cents(currentExpected) !== cents(count.expectedAmount),
    noEntry: !!count && currentExpected === null,
  };
}

const record = (tenantId: string, entryDate: string, poolName: string, expectedAmount: number, input: CashCountInput, performedBy: Performer) => ({
  tenantId, entryDate, poolName, expectedAmount, ...input, countedTotal: countedTotal(input), countedByEmail: performedBy?.email ?? null,
});

export const cashCountService = {
  // Tip entry dates in range (counted or not), plus older uncounted drops, newest first.
  // A deposit filter instead returns every count in that deposit, whatever its date.
  async list(tenantId: string, query: CashCountQuery) {
    const active = { tenantId, isDeleted: false };
    let entries: { entryDate: string; poolName: string; cashInRegister: number }[];
    let counts: CashCount[];
    let shown: (date: string, counted: boolean) => boolean;

    if (query.deposit) {
      counts = await prisma.cashCount.findMany({ where: { ...active, deposit: query.deposit } });
      entries = await prisma.tipEntry.findMany({ where: { ...active, entryDate: { in: counts.map((c) => c.entryDate) } } });
      // A date's other pools may belong to a different deposit, or none.
      shown = (_date, counted) => counted;
    } else {
      const today = await tenantToday(tenantId);
      const from = query.from ?? daysBefore(today, DEFAULT_RANGE_DAYS - 1);
      const to = query.to ?? '9999-12-31';
      const lookback = daysBefore(today, UNCOUNTED_LOOKBACK_DAYS);
      [entries, counts] = await Promise.all([
        prisma.tipEntry.findMany({
          where: { ...active, OR: [{ entryDate: { gte: from, lte: to } }, { entryDate: { gte: lookback, lt: from }, cashInRegister: { gt: 0 } }] },
        }),
        prisma.cashCount.findMany({ where: { ...active, entryDate: { gte: from < lookback ? from : lookback, lte: to } } }),
      ]);
      shown = (date, counted) => (date >= from && date <= to) || !counted;
    }

    const entryByKey = new Map(entries.map((e) => [poolKey(e.entryDate, e.poolName), e]));
    const countByKey = new Map(counts.map((c) => [poolKey(c.entryDate, c.poolName), c]));

    return [...new Set([...entryByKey.keys(), ...countByKey.keys()])]
      .map((key) => ({ entry: entryByKey.get(key), count: countByKey.get(key) }))
      // A card-only event has no envelope, so it would otherwise sit at "Not counted" forever.
      .filter(({ entry, count }) => count || (entry?.poolName ? entry.cashInRegister > 0 : true))
      .map(({ entry, count }) => ({ entryDate: (entry ?? count)!.entryDate, poolName: (entry ?? count)!.poolName, entry, count }))
      .filter(({ entryDate, count }) => shown(entryDate, !!count))
      .sort((a, b) => b.entryDate.localeCompare(a.entryDate) || a.poolName.localeCompare(b.poolName))
      .map(({ entryDate, poolName, entry, count }) => toRow(entryDate, poolName, entry?.cashInRegister ?? null, count ?? null));
  },

  async create(tenantId: string, { entryDate, poolName, ...input }: CreateCashCountInput, performedBy?: Performer) {
    const expected = await expectedFor(tenantId, entryDate, poolName);
    if (expected === null) throw new TipCalculationError('There is no tip entry for this date', 'NO_TIP_ENTRY');
    const active = await prisma.cashCount.findMany({ where: { tenantId, entryDate, isDeleted: false }, select: { poolName: true } });
    if (active.some((c) => samePool(c.poolName, poolName))) {
      throw new TipCalculationError('This drop has already been counted', 'ALREADY_COUNTED');
    }
    const created = await prisma.cashCount.create({ data: record(tenantId, entryDate, poolName, expected, input, performedBy) });
    await auditService.log({ tenantId, entityType: 'CASH_COUNT', entityId: created.id, action: 'CREATE', performedBy, newValues: auditValues(created) });
    return created;
  },

  // Replaces the count (old version kept). Re-reads the expected amount, so a recount after a
  // tip entry correction clears the "entry changed" flag.
  async update(tenantId: string, id: string, input: CashCountInput, performedBy?: Performer) {
    const existing = await prisma.cashCount.findFirst({ where: { id, tenantId, isDeleted: false } });
    if (!existing) return null;
    const expected = (await expectedFor(tenantId, existing.entryDate, existing.poolName)) ?? existing.expectedAmount;
    const created = await prisma.$transaction(async (tx) => {
      await tx.cashCount.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });
      const next = await tx.cashCount.create({ data: record(tenantId, existing.entryDate, existing.poolName, expected, input, performedBy) });
      await tx.cashCount.update({ where: { id }, data: { replacedById: next.id } });
      return next;
    });
    await auditService.log({
      tenantId, entityType: 'CASH_COUNT', entityId: created.id, action: 'UPDATE', performedBy,
      oldValues: { id, ...auditValues(existing) }, newValues: auditValues(created),
    });
    return created;
  },

  async remove(tenantId: string, id: string, performedBy?: Performer) {
    const existing = await prisma.cashCount.findFirst({ where: { id, tenantId, isDeleted: false } });
    if (!existing) return false;
    await prisma.cashCount.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });
    await auditService.log({ tenantId, entityType: 'CASH_COUNT', entityId: id, action: 'DELETE', performedBy, oldValues: auditValues(existing) });
    return true;
  },
};
