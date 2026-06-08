import { describe, it, expect } from 'vitest';
import { toCP, fromCP, formatGold } from '../utils/gold.js';

describe('toCP', () => {
  it('converts gp, sp, cp to total copper', () => {
    expect(toCP(1, 0, 0)).toBe(100);
    expect(toCP(0, 1, 0)).toBe(10);
    expect(toCP(0, 0, 1)).toBe(1);
    expect(toCP(2, 3, 4)).toBe(234);
  });
  it('handles zeros', () => expect(toCP(0, 0, 0)).toBe(0));
  it('truncates fractions', () => expect(toCP(1.9, 0, 0)).toBe(100));
});

describe('fromCP', () => {
  it('breaks down to gp/sp/cp', () => {
    expect(fromCP(234)).toEqual({ gp: 2, sp: 3, cp: 4 });
    expect(fromCP(0)).toEqual({ gp: 0, sp: 0, cp: 0 });
  });
  it('round-trips with toCP', () => {
    expect(fromCP(toCP(5, 7, 3))).toEqual({ gp: 5, sp: 7, cp: 3 });
  });
});

describe('formatGold', () => {
  it('formats all denominations', () => expect(formatGold(2, 3, 4)).toBe('2 GP 3 SP 4 CP'));
  it('omits zeros', () => expect(formatGold(5, 0, 0)).toBe('5 GP'));
  it('returns 0 CP when all zero', () => expect(formatGold(0, 0, 0)).toBe('0 CP'));
});
