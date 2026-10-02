import prisma from '../database/client';
import { auditService } from './audit.service';
import { tenantToday } from './tenant.service';
import { TipCalculationError } from './tip-calculation.service';
import { CashCountInput, CashCountQuery, CreateCashCountInput } from '../validation/cash-count.schema';

type Performer = { userId: string; email: string } | undefined;
type Tally = Omit<CashCountInput, 'deposit' | 'comments'>;
type CashCount = NonNullable<Awaited<ReturnType<typeof prisma.cashCount.findFirst>>>;

const FACE_VALUES = { bills100: 100, bills50: 50, bills20: 20, bills10: 10, bills5: 5, bills2: 2, bills1: 1 } as const;
const BILLS = Object.keys(FACE_VALUES) as (keyof typeof FACE_VALUES)[];
const DEFAULT_RANGE_DAYS = 14;
// How far back an uncounted drop keeps showing up, so launch day doesn't list all of history.
const UNCOUNTED_LOOKBACK_DAYS = 60;
const AUDITED = ['entryDate', 'expectedAmount', ...BILLS, 'coins', 'countedTotal', 'deposit', 'comments'] as const;

const cents = (n: number) => Math.round(n * 100);

export const countedTotal = (t: Tally) =>
  (BILLS.reduce((sum, k) => sum + t[k] * FACE_VALUES[k] * 100, 0) + cents(t.coins)) / 100;

const daysBefore = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

const auditValues = (c: CashCount) => Object.fromEntries(AUDITED.map((k) => [k, c[k]]));

// A day normally has one active tip entry; a forced duplicate means two envelopes, counted together.
async function expectedFor(tenantId: string, entryDate: string) {
  const entries = await prisma.tipEntry.findMany({ where: { tenantId, entryDate, isDeleted: false }, select: { cashInRegister: true } });
  return entries.length ? entries.reduce((sum, e) => sum + cents(e.cashInRegister), 0) / 100 : null;
}

function toRow(entryDate: string, currentExpected: number | null, count: CashCount | null) {
  const variance = count ? (cents(count.countedTotal) - cents(count.expectedAmount)) / 100 : null;
  return {
    entryDate,
    currentExpected,
    count,
    variance,
    status: variance === null ? 'NOT_COUNTED' : variance === 0 ? 'MATCHES' : variance < 0 ? 'SHORT' : 'OVER',
    entryChanged: !!count && currentExpected !== null && cents(currentExpected) !== cents(count.expectedAmount),
    noEntry: !!count && currentExpected === null,
  };
}

const record = (tenantId: string, entryDate: string, expectedAmount: number, input: CashCountInput, performedBy: Performer) => ({
  tenantId, entryDate, expectedAmount, ...input, countedTotal: countedTotal(input), countedByEmail: performedBy?.email ?? null,
});

export const cashCountService = {
  // Tip entry dates in range (counted or not), plus older uncounted drops, newest first.
  // A deposit filter instead returns every count in that deposit, whatever its date.
  async list(tenantId: string, query: CashCountQuery) {
    const active = { tenantId, isDeleted: false };
    let entries: { entryDate: string; cashInRegister: number }[];
    let counts: CashCount[];
    let shown: (date: string, counted: boolean) => boolean;

    if (query.deposit) {
      counts = await prisma.cashCount.findMany({ where: { ...active, deposit: query.deposit } });
      entries = await prisma.tipEntry.findMany({ where: { ...active, entryDate: { in: counts.map((c) => c.entryDate) } } });
      shown = () => true;
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

    const expected = new Map<string, number>();
    for (const e of entries) expected.set(e.entryDate, (cents(expected.get(e.entryDate) ?? 0) + cents(e.cashInRegister)) / 100);
    const countByDate = new Map(counts.map((c) => [c.entryDate, c]));

    return [...new Set([...expected.keys(), ...countByDate.keys()])]
      .filter((d) => shown(d, countByDate.has(d)))
      .sort((a, b) => b.localeCompare(a))
      .map((d) => toRow(d, expected.get(d) ?? null, countByDate.get(d) ?? null));
  },

  async create(tenantId: string, { entryDate, ...input }: CreateCashCountInput, performedBy?: Performer) {
    const expected = await expectedFor(tenantId, entryDate);
    if (expected === null) throw new TipCalculationError('There is no tip entry for this date', 'NO_TIP_ENTRY');
    if (await prisma.cashCount.findFirst({ where: { tenantId, entryDate, isDeleted: false } })) {
      throw new TipCalculationError('This drop has already been counted', 'ALREADY_COUNTED');
    }
    const created = await prisma.cashCount.create({ data: record(tenantId, entryDate, expected, input, performedBy) });
    await auditService.log({ tenantId, entityType: 'CASH_COUNT', entityId: created.id, action: 'CREATE', performedBy, newValues: auditValues(created) });
    return created;
  },

  // Replaces the count (old version kept). Re-reads the expected amount, so a recount after a
  // tip entry correction clears the "entry changed" flag.
  async update(tenantId: string, id: string, input: CashCountInput, performedBy?: Performer) {
    const existing = await prisma.cashCount.findFirst({ where: { id, tenantId, isDeleted: false } });
    if (!existing) return null;
    const expected = (await expectedFor(tenantId, existing.entryDate)) ?? existing.expectedAmount;
    const created = await prisma.$transaction(async (tx) => {
      await tx.cashCount.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });
      const next = await tx.cashCount.create({ data: record(tenantId, existing.entryDate, expected, input, performedBy) });
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
