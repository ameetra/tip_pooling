import { calculateTips, computeCashTips, TipCalculationError } from '../tip-calculation.service';
import { StintInput, SupportStaffConfig, TipCalculationInput, TipCalculationResult } from '../../types/tip-calculation.types';

const server = (o: Partial<StintInput> = {}): StintInput => ({ employeeId: 's1', name: 'Server A', role: 'SERVER', hours: 8, hourlyRate: 15, ...o });
const busser = (o: Partial<StintInput> = {}): StintInput => ({ employeeId: 'b1', name: 'Busser A', role: 'BUSSER', hours: 6, hourlyRate: 12, ...o });
const expeditor = (o: Partial<StintInput> = {}): StintInput => ({ employeeId: 'e1', name: 'Expeditor A', role: 'EXPEDITOR', hours: 4, hourlyRate: 13, ...o });

const run = (totalTipPool: number, stints: StintInput[], supportStaffConfig: SupportStaffConfig[] = []) =>
  calculateTips({ totalTipPool, stints, supportStaffConfig });

const sumTips = (r: TipCalculationResult) => Number(r.stints.reduce((s, x) => s + x.finalTips, 0).toFixed(2));
const emp = (r: TipCalculationResult, id: string) => r.employees.find((e) => e.employeeId === id)!;
const stint = (r: TipCalculationResult, id: string, role: string) => r.stints.find((s) => s.employeeId === id && s.role === role)!;

describe('Tip Calculation Service (prorated hours, per-role pool)', () => {
  it('single server gets 100% of the pool', () => {
    const r = run(1000, [server()]);
    expect(emp(r, 's1').totalTips).toBe(1000);
  });

  it('two servers equal hours split 50/50', () => {
    const r = run(1000, [server({ employeeId: 's1' }), server({ employeeId: 's2' })]);
    expect(emp(r, 's1').totalTips).toBe(500);
    expect(emp(r, 's2').totalTips).toBe(500);
  });

  it('two servers unequal hours split 2:1', () => {
    const r = run(900, [server({ employeeId: 's1', hours: 8 }), server({ employeeId: 's2', hours: 4 })]);
    expect(emp(r, 's1').totalTips).toBe(600);
    expect(emp(r, 's2').totalTips).toBe(300);
  });

  it('busser takes its configured % off the top; servers split the rest', () => {
    const r = run(1000, [server({ employeeId: 's1' }), server({ employeeId: 's2' }), busser()], [{ role: 'BUSSER', percentage: 20 }]);
    expect(emp(r, 'b1').totalTips).toBe(200);      // 20% of 1000
    expect(emp(r, 's1').totalTips).toBe(400);      // 80% of pool, split 50/50
    expect(emp(r, 's2').totalTips).toBe(400);
    expect(sumTips(r)).toBe(1000);
  });

  it("a role's pool is split among that role's staff by hours", () => {
    const r = run(1000, [
      server({ employeeId: 's1', hours: 10 }),
      busser({ employeeId: 'carol', name: 'Carol', hours: 6 }),
      busser({ employeeId: 'dave', name: 'Dave', hours: 4 }),
    ], [{ role: 'BUSSER', percentage: 20 }]);
    expect(emp(r, 'carol').totalTips).toBe(120);   // 6/10 of $200
    expect(emp(r, 'dave').totalTips).toBe(80);      // 4/10 of $200
    expect(emp(r, 's1').totalTips).toBe(800);
    expect(sumTips(r)).toBe(1000);
  });

  it('two support roles each take their own % of the pool', () => {
    const r = run(1000, [server({ employeeId: 's1', hours: 10 }), busser({ hours: 6 }), expeditor({ hours: 4 })],
      [{ role: 'BUSSER', percentage: 20 }, { role: 'EXPEDITOR', percentage: 15 }]);
    expect(emp(r, 'b1').totalTips).toBe(200);
    expect(emp(r, 'e1').totalTips).toBe(150);
    expect(emp(r, 's1').totalTips).toBe(650);
    expect(sumTips(r)).toBe(1000);
  });

  it('applies a day-wide cap: support cannot out-earn the top server; excess returns to servers', () => {
    const servers = Array.from({ length: 10 }, (_, i) => server({ employeeId: `s${i}`, hours: 1 }));
    const r = run(1000, [...servers, busser({ employeeId: 'b1', hours: 5 })], [{ role: 'BUSSER', percentage: 50 }]);
    // Server pool $500 over 10 servers = $50 each (max server tip = $50).
    // Busser pool $500 (single busser) capped at $50; excess $450 returns to servers.
    expect(emp(r, 'b1').totalTips).toBe(50);
    expect(sumTips(r)).toBe(1000);
    r.employees.filter((e) => e.employeeId !== 'b1').forEach((e) => expect(e.totalTips).toBeGreaterThan(50));
  });

  it('no cap when support stays below the top server', () => {
    const r = run(1000, [server({ employeeId: 's1' }), busser()], [{ role: 'BUSSER', percentage: 10 }]);
    expect(emp(r, 'b1').totalTips).toBe(100);
    expect(emp(r, 's1').totalTips).toBe(900);
  });

  it('aggregates a multi-role employee: wages per role, $/hr once', () => {
    const r = run(1000, [
      { employeeId: 'alice', name: 'Alice', role: 'SERVER', hours: 4, hourlyRate: 15 },
      { employeeId: 'alice', name: 'Alice', role: 'BUSSER', hours: 3, hourlyRate: 12 },
      { employeeId: 'bob', name: 'Bob', role: 'SERVER', hours: 6, hourlyRate: 15 },
    ], [{ role: 'BUSSER', percentage: 20 }]);

    const alice = emp(r, 'alice');
    expect(alice.roles.sort()).toEqual(['BUSSER', 'SERVER']);
    expect(alice.totalHours).toBe(7);
    expect(alice.totalWage).toBe(96);                 // 4*15 + 3*12
    expect(alice.totalTips).toBe(520);                // 320 server + 200 busser
    expect(alice.effectiveHourlyRate).toBe(88);       // (96+520)/7
    expect(emp(r, 'bob').totalTips).toBe(480);
    expect(sumTips(r)).toBe(1000);
  });

  it('rounds remainder to the highest earner ($10 / 3 servers)', () => {
    const r = run(10, [server({ employeeId: 's1' }), server({ employeeId: 's2' }), server({ employeeId: 's3' })]);
    const tips = r.stints.map((s) => s.finalTips).sort((a, b) => a - b);
    expect(tips).toEqual([3.33, 3.33, 3.34]);
    expect(sumTips(r)).toBe(10);
  });

  it('keeps total distributed equal to the pool', () => {
    const r = run(777.77, [
      server({ employeeId: 's1', hours: 6 }), server({ employeeId: 's2', hours: 7 }),
      server({ employeeId: 's3', hours: 5 }), busser({ hours: 4 }),
    ], [{ role: 'BUSSER', percentage: 20 }]);
    expect(sumTips(r)).toBe(777.77);
  });

  it('decimal hours prorate accurately', () => {
    const r = run(1000, [server({ employeeId: 's1', hours: 4.5 }), server({ employeeId: 's2', hours: 7.25 })]);
    expect(emp(r, 's1').totalTips).toBeCloseTo(382.98, 1);
    expect(emp(r, 's2').totalTips).toBeCloseTo(617.02, 1);
    expect(sumTips(r)).toBe(1000);
  });

  describe('validation', () => {
    it('throws when there are no servers', () => {
      expect(() => run(1000, [busser()], [{ role: 'BUSSER', percentage: 20 }])).toThrow('At least one server is required');
    });

    it('throws on invalid stint hours (out of 0.5-16)', () => {
      expect(() => run(1000, [server({ hours: 0 })])).toThrow(TipCalculationError);
      expect(() => run(1000, [server({ hours: 17 })])).toThrow('invalid hours');
    });

    it('throws when one employee works more than 16 hours total across roles', () => {
      expect(() => run(1000, [
        { employeeId: 'a', name: 'A', role: 'SERVER', hours: 10, hourlyRate: 15 },
        { employeeId: 'a', name: 'A', role: 'BUSSER', hours: 8, hourlyRate: 12 },
      ], [{ role: 'BUSSER', percentage: 20 }])).toThrow('hours total');
    });

    it('throws on a negative tip pool', () => {
      expect(() => run(-100, [server()])).toThrow('Total tip pool cannot be negative');
    });

    it('throws on a duplicate (employee, role) stint', () => {
      expect(() => run(1000, [server({ employeeId: 'x' }), server({ employeeId: 'x' })])).toThrow('Duplicate stint');
    });

    it('throws when support percentages total 100% or more', () => {
      expect(() => run(1000, [server({ employeeId: 's1' }), busser(), expeditor()],
        [{ role: 'BUSSER', percentage: 50 }, { role: 'EXPEDITOR', percentage: 50 }])).toThrow('Support percentages total');
    });

    it('gives 0 tips (not NaN) to a support role with no configured percentage', () => {
      const r = run(1000, [server({ employeeId: 's1' }), busser()], []); // no config
      expect(emp(r, 'b1').totalTips).toBe(0);
      expect(emp(r, 's1').totalTips).toBe(1000);
      expect(sumTips(r)).toBe(1000);
    });
  });

  describe('computeCashTips', () => {
    it('adds drawer overage and the tip jar', () => {
      expect(computeCashTips(1000, 800, 50)).toBe(250);   // (1000-800) + 50
    });
    it('allows a negative drawer overage (register short)', () => {
      expect(computeCashTips(900, 1000, 300)).toBe(200);  // -100 + 300
    });
    it('handles a jar-only scenario', () => {
      expect(computeCashTips(0, 0, 250)).toBe(250);
    });
  });
});
