import { countedTotal } from '../cash-count.service';

const none = { bills100: 0, bills50: 0, bills20: 0, bills10: 0, bills5: 0, bills2: 0, bills1: 0, coins: 0 };

describe('countedTotal', () => {
  it('adds bill counts by face value plus coins (Pieces 2026-09-09 envelope: $257.46)', () => {
    expect(countedTotal({ ...none, bills50: 1, bills20: 9, bills10: 2, bills1: 7, coins: 0.46 })).toBe(257.46);
  });

  it('counts every denomination', () => {
    expect(countedTotal({ bills100: 1, bills50: 1, bills20: 1, bills10: 1, bills5: 1, bills2: 1, bills1: 1, coins: 0 })).toBe(188);
  });

  it('handles coins only', () => {
    expect(countedTotal({ ...none, coins: 3.37 })).toBe(3.37);
  });

  it('is 0 for an empty envelope', () => {
    expect(countedTotal(none)).toBe(0);
  });

  it('has no floating-point drift', () => {
    expect(countedTotal({ ...none, bills1: 1, coins: 0.1 + 0.2 })).toBe(1.3);
  });
});
