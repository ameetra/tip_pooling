import { calculateTips, calculateCashTips, TipCalculationError } from '../tip-calculation.service';
import { Employee, SupportStaffConfig, TipCalculationInput } from '../../types/tip-calculation.types';

const makeServer = (overrides: Partial<Employee> = {}): Employee => ({
  id: 'server-1',
  name: 'Server A',
  roleOnDay: 'SERVER',
  shifts: ['shift-1'],
  hoursWorked: 8,
  hourlyRate: 15,
  ...overrides,
});

const makeBusser = (overrides: Partial<Employee> = {}): Employee => ({
  id: 'busser-1',
  name: 'Busser A',
  roleOnDay: 'BUSSER',
  shifts: ['shift-1'],
  hoursWorked: 6,
  hourlyRate: 12,
  ...overrides,
});

const defaultSupportConfig: SupportStaffConfig[] = [
  { role: 'BUSSER', percentage: 20 },
  { role: 'EXPEDITOR', percentage: 15 },
];

const sumFinalTips = (results: ReturnType<typeof calculateTips>) =>
  Number(results.reduce((sum, r) => sum + r.finalTips, 0).toFixed(2));

describe('Tip Calculation Service', () => {
  // TC-CALC-001: Single server receives 100% of tips
  it('TC-CALC-001: single server gets 100% of tips', () => {
    const input: TipCalculationInput = {
      totalTipPool: 1000,
      employees: [makeServer()],
      supportStaffConfig: defaultSupportConfig,
    };
    const results = calculateTips(input);
    expect(results).toHaveLength(1);
    expect(results[0].finalTips).toBe(1000);
    expect(results[0].baseTips).toBe(1000);
  });

  // TC-CALC-002: Two servers equal hours = 50/50 split
  it('TC-CALC-002: two servers equal hours split 50/50', () => {
    const input: TipCalculationInput = {
      totalTipPool: 1000,
      employees: [
        makeServer({ id: 's1', name: 'Server A', hoursWorked: 8 }),
        makeServer({ id: 's2', name: 'Server B', hoursWorked: 8 }),
      ],
      supportStaffConfig: defaultSupportConfig,
    };
    const results = calculateTips(input);
    expect(results[0].finalTips).toBe(500);
    expect(results[1].finalTips).toBe(500);
  });

  // TC-CALC-003: Two servers unequal hours (2:1 ratio)
  it('TC-CALC-003: two servers unequal hours (2:1 ratio)', () => {
    const input: TipCalculationInput = {
      totalTipPool: 900,
      employees: [
        makeServer({ id: 's1', name: 'Server A', hoursWorked: 8 }),
        makeServer({ id: 's2', name: 'Server B', hoursWorked: 4 }),
      ],
      supportStaffConfig: defaultSupportConfig,
    };
    const results = calculateTips(input);
    expect(results[0].finalTips).toBe(600);
    expect(results[1].finalTips).toBe(300);
  });

  // TC-CALC-004: Server works multiple shifts (tips by total hours, not per-shift)
  it('TC-CALC-004: server works multiple shifts, tips by total hours', () => {
    const input: TipCalculationInput = {
      totalTipPool: 1000,
      employees: [
        makeServer({ id: 's1', name: 'Server A', hoursWorked: 8, shifts: ['shift-1', 'shift-2'] }),
        makeServer({ id: 's2', name: 'Server B', hoursWorked: 8, shifts: ['shift-1'] }),
      ],
      supportStaffConfig: defaultSupportConfig,
    };
    const results = calculateTips(input);
    // Both 8 hrs = 50/50 regardless of number of shifts
    expect(results[0].finalTips).toBe(500);
    expect(results[1].finalTips).toBe(500);
  });

  // TC-CALC-005: Busser receives percentage from servers on same shift
  it('TC-CALC-005: busser receives percentage from servers on same shift', () => {
    const input: TipCalculationInput = {
      totalTipPool: 1000,
      employees: [
        makeServer({ id: 's1', name: 'Server A', hoursWorked: 8 }),
        makeServer({ id: 's2', name: 'Server B', hoursWorked: 8 }),
        makeBusser({ id: 'b1', name: 'Busser A', shifts: ['shift-1'] }),
      ],
      supportStaffConfig: [{ role: 'BUSSER', percentage: 20 }],
    };
    const results = calculateTips(input);
    const busser = results.find((r) => r.employeeId === 'b1')!;
    // Each server gets $500 base. Busser gets 20% from each = $100 + $100 = $200
    expect(busser.finalTips).toBe(200);
    expect(busser.supportTipsReceived).toBe(200);
  });

  // TC-CALC-006: Support staff cap applied
  it('TC-CALC-006: support staff cap applied when tips exceed highest server', () => {
    // Create scenario where busser percentage would exceed highest server's final tips
    // 1 server short shift, busser with high percentage from that server
    const input: TipCalculationInput = {
      totalTipPool: 100,
      employees: [
        makeServer({ id: 's1', name: 'Server A', hoursWorked: 2, shifts: ['shift-1'] }),
        makeServer({ id: 's2', name: 'Server B', hoursWorked: 8, shifts: ['shift-2'] }),
        makeBusser({ id: 'b1', name: 'Busser A', hoursWorked: 8, shifts: ['shift-1', 'shift-2'] }),
      ],
      supportStaffConfig: [{ role: 'BUSSER', percentage: 50 }],
    };
    const results = calculateTips(input);
    const busser = results.find((r) => r.employeeId === 'b1')!;
    const serverA = results.find((r) => r.employeeId === 's1')!;
    const serverB = results.find((r) => r.employeeId === 's2')!;

    // Server A base: (2/10)*100 = $20. Server B base: (8/10)*100 = $80
    // Busser uncapped: 50% of $20 (shift-1) + 50% of $80 (shift-2) = $10 + $40 = $50
    // Highest server on busser's shifts: max(serverA.final, serverB.final)
    // ServerA final after deduction = 20-10 = 10, ServerB final after deduction = 80-40 = 40
    // Highest = 40. Busser tips $50 > $40? Yes, cap to $40
    expect(busser.finalTips).toBeLessThanOrEqual(
      Math.max(serverA.finalTips, serverB.finalTips),
    );
  });

  // TC-CALC-007: Support staff cap not needed
  it('TC-CALC-007: support staff cap not needed when tips below server', () => {
    const input: TipCalculationInput = {
      totalTipPool: 1000,
      employees: [
        makeServer({ id: 's1', name: 'Server A', hoursWorked: 8 }),
        makeBusser({ id: 'b1', name: 'Busser A', hoursWorked: 6 }),
      ],
      supportStaffConfig: [{ role: 'BUSSER', percentage: 10 }],
    };
    const results = calculateTips(input);
    const busser = results.find((r) => r.employeeId === 'b1')!;
    // Server base: $1000. Busser gets 10% = $100. Server final = $900. $100 < $900 = no cap
    expect(busser.finalTips).toBe(100);
  });

  // TC-CALC-008: Multiple support staff on same shift
  it('TC-CALC-008: multiple support staff calculate independently', () => {
    const input: TipCalculationInput = {
      totalTipPool: 1000,
      employees: [
        makeServer({ id: 's1', name: 'Server A', hoursWorked: 8 }),
        makeServer({ id: 's2', name: 'Server B', hoursWorked: 8 }),
        makeBusser({ id: 'b1', name: 'Busser A', hoursWorked: 6 }),
        {
          id: 'e1',
          name: 'Expeditor A',
          roleOnDay: 'EXPEDITOR',
          shifts: ['shift-1'],
          hoursWorked: 4,
          hourlyRate: 13,
        },
      ],
      supportStaffConfig: [
        { role: 'BUSSER', percentage: 20 },
        { role: 'EXPEDITOR', percentage: 15 },
      ],
    };
    const results = calculateTips(input);
    const busser = results.find((r) => r.employeeId === 'b1')!;
    const expeditor = results.find((r) => r.employeeId === 'e1')!;

    // Each server base: $500. Busser 20% from each = $200. Expeditor 15% from each = $150
    expect(busser.supportTipsReceived).toBe(200);
    expect(expeditor.supportTipsReceived).toBe(150);
  });

  // TC-CALC-009: Rounding: $10 split 3 ways
  it('TC-CALC-009: $10 split 3 ways = $3.33, $3.33, $3.34', () => {
    const input: TipCalculationInput = {
      totalTipPool: 10,
      employees: [
        makeServer({ id: 's1', name: 'Server A', hoursWorked: 8 }),
        makeServer({ id: 's2', name: 'Server B', hoursWorked: 8 }),
        makeServer({ id: 's3', name: 'Server C', hoursWorked: 8 }),
      ],
      supportStaffConfig: [],
    };
    const results = calculateTips(input);
    const tips = results.map((r) => r.finalTips).sort((a, b) => a - b);
    // Two get $3.33, one gets $3.34 (rounding remainder to highest earner)
    expect(tips).toEqual([3.33, 3.33, 3.34]);
    expect(sumFinalTips(results)).toBe(10);
  });

  // TC-CALC-010: Total distributed equals tip pool (±$0.01)
  it('TC-CALC-010: total distributed equals tip pool exactly', () => {
    const input: TipCalculationInput = {
      totalTipPool: 777.77,
      employees: [
        makeServer({ id: 's1', name: 'Server A', hoursWorked: 6 }),
        makeServer({ id: 's2', name: 'Server B', hoursWorked: 7 }),
        makeServer({ id: 's3', name: 'Server C', hoursWorked: 5 }),
        makeBusser({ id: 'b1', name: 'Busser A', hoursWorked: 4 }),
      ],
      supportStaffConfig: [{ role: 'BUSSER', percentage: 20 }],
    };
    const results = calculateTips(input);
    const total = sumFinalTips(results);
    expect(Math.abs(total - 777.77)).toBeLessThanOrEqual(0.01);
  });

  // TC-CALC-011: Zero servers throws error
  it('TC-CALC-011: zero servers throws error', () => {
    const input: TipCalculationInput = {
      totalTipPool: 1000,
      employees: [makeBusser()],
      supportStaffConfig: defaultSupportConfig,
    };
    expect(() => calculateTips(input)).toThrow('At least one server is required');
  });

  // TC-CALC-012: Zero hours throws error
  it('TC-CALC-012: zero server hours throws error', () => {
    const input: TipCalculationInput = {
      totalTipPool: 1000,
      employees: [makeServer({ hoursWorked: 0 })],
      supportStaffConfig: [],
    };
    // hoursWorked 0 fails the 0.5-16 validation first
    expect(() => calculateTips(input)).toThrow(TipCalculationError);
  });

  // TC-CALC-013: Negative tip pool throws error
  it('TC-CALC-013: negative tip pool throws error', () => {
    const input: TipCalculationInput = {
      totalTipPool: -100,
      employees: [makeServer()],
      supportStaffConfig: [],
    };
    expect(() => calculateTips(input)).toThrow('Total tip pool cannot be negative');
  });

  // TC-CALC-014: Closing < starting drawer validation
  it('TC-CALC-014: closing drawer less than starting drawer throws error', () => {
    expect(() => calculateCashTips(400, 500, 0)).toThrow(
      'Closing drawer cannot be less than starting drawer',
    );
  });

  // TC-CALC-015: Employee > 16 hours validation
  it('TC-CALC-015: employee over 16 hours throws error', () => {
    const input: TipCalculationInput = {
      totalTipPool: 1000,
      employees: [makeServer({ hoursWorked: 17 })],
      supportStaffConfig: [],
    };
    expect(() => calculateTips(input)).toThrow('invalid hours: 17');
  });

  // TC-CALC-016: Duplicate employee validation
  it('TC-CALC-016: duplicate employee throws error', () => {
    const input: TipCalculationInput = {
      totalTipPool: 1000,
      employees: [
        makeServer({ id: 'same-id', name: 'Server A' }),
        makeServer({ id: 'same-id', name: 'Server B' }),
      ],
      supportStaffConfig: [],
    };
    expect(() => calculateTips(input)).toThrow('Duplicate employee');
  });

  // TC-CALC-017: Support staff with no shared shifts = $0
  it('TC-CALC-017: support staff with no shared shifts gets $0', () => {
    const input: TipCalculationInput = {
      totalTipPool: 1000,
      employees: [
        makeServer({ id: 's1', shifts: ['shift-1'] }),
        makeBusser({ id: 'b1', shifts: ['shift-2'] }), // different shift
      ],
      supportStaffConfig: [{ role: 'BUSSER', percentage: 20 }],
    };
    const results = calculateTips(input);
    const busser = results.find((r) => r.employeeId === 'b1')!;
    expect(busser.finalTips).toBe(0);
    expect(busser.supportTipsReceived).toBe(0);
  });

  // TC-CALC-018: Complex 3-way: 2 servers + 1 busser
  it('TC-CALC-018: complex scenario with 2 servers and 1 busser', () => {
    const input: TipCalculationInput = {
      totalTipPool: 900,
      employees: [
        makeServer({ id: 's1', name: 'Server A', hoursWorked: 6, shifts: ['shift-1'] }),
        makeServer({ id: 's2', name: 'Server B', hoursWorked: 3, shifts: ['shift-1'] }),
        makeBusser({ id: 'b1', name: 'Busser A', hoursWorked: 4, shifts: ['shift-1'] }),
      ],
      supportStaffConfig: [{ role: 'BUSSER', percentage: 20 }],
    };
    const results = calculateTips(input);
    const serverA = results.find((r) => r.employeeId === 's1')!;
    const serverB = results.find((r) => r.employeeId === 's2')!;
    const busser = results.find((r) => r.employeeId === 'b1')!;

    // Server A base: (6/9)*900 = $600, Server B base: (3/9)*900 = $300
    expect(serverA.baseTips).toBe(600);
    expect(serverB.baseTips).toBe(300);

    // Busser gets 20% from each: 20%*$600 + 20%*$300 = $120 + $60 = $180
    expect(busser.supportTipsReceived).toBe(180);

    // Server A final: $600 - $120 = $480, Server B final: $300 - $60 = $240
    expect(serverA.finalTips).toBe(480);
    expect(serverB.finalTips).toBe(240);

    // Total check
    expect(sumFinalTips(results)).toBe(900);
  });

  // TC-CALC-019: Decimal hours (4.5, 7.25)
  it('TC-CALC-019: decimal hours are prorated accurately', () => {
    const input: TipCalculationInput = {
      totalTipPool: 1000,
      employees: [
        makeServer({ id: 's1', name: 'Server A', hoursWorked: 4.5 }),
        makeServer({ id: 's2', name: 'Server B', hoursWorked: 7.25 }),
      ],
      supportStaffConfig: [],
    };
    const results = calculateTips(input);
    const sA = results.find((r) => r.employeeId === 's1')!;
    const sB = results.find((r) => r.employeeId === 's2')!;

    // Total hours: 11.75. A: 4.5/11.75 = 0.38297... * 1000 = $382.98
    // B: 7.25/11.75 = 0.61702... * 1000 = $617.02
    expect(sA.finalTips).toBeCloseTo(382.98, 1);
    expect(sB.finalTips).toBeCloseTo(617.02, 1);
    expect(sumFinalTips(results)).toBe(1000);
  });

  // TC-CALC-020: Large tip ($10,000+) precision
  it('TC-CALC-020: large tip pool maintains precision', () => {
    const input: TipCalculationInput = {
      totalTipPool: 15000,
      employees: [
        makeServer({ id: 's1', name: 'Server A', hoursWorked: 8 }),
        makeServer({ id: 's2', name: 'Server B', hoursWorked: 6 }),
        makeServer({ id: 's3', name: 'Server C', hoursWorked: 10 }),
        makeBusser({ id: 'b1', name: 'Busser A', hoursWorked: 7 }),
      ],
      supportStaffConfig: [{ role: 'BUSSER', percentage: 20 }],
    };
    const results = calculateTips(input);
    const total = sumFinalTips(results);
    expect(Math.abs(total - 15000)).toBeLessThanOrEqual(0.01);

    // All tips should be positive
    results.forEach((r) => {
      expect(r.finalTips).toBeGreaterThanOrEqual(0);
    });
  });

  // Additional: Cash tips formula verification (PRD example)
  describe('calculateCashTips', () => {
    it('calculates cash tips with cash sales deducted', () => {
      // PRD example: Starting $500, Closing $1800, Cash Sales $1000
      expect(calculateCashTips(1800, 500, 1000)).toBe(300);
    });

    it('defaults cash sales to 0 for credit-card-only', () => {
      expect(calculateCashTips(1800, 500)).toBe(1300);
    });

    it('handles separate tip jar scenario', () => {
      // Starting = 0, Closing = total tips, Cash Sales = 0
      expect(calculateCashTips(250, 0, 0)).toBe(250);
    });
  });
});
