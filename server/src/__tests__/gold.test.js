import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toCP, fromCP, formatGold } from '../gold.js';

describe('toCP', () => {
  it('converts gp, sp, cp to total copper', () => {
    assert.equal(toCP(1, 0, 0), 100);
    assert.equal(toCP(0, 1, 0), 10);
    assert.equal(toCP(0, 0, 1), 1);
    assert.equal(toCP(2, 3, 4), 234);
  });

  it('handles zero values', () => {
    assert.equal(toCP(0, 0, 0), 0);
  });

  it('handles large values', () => {
    assert.equal(toCP(1000, 0, 0), 100000);
  });

  it('truncates fractional parts', () => {
    assert.equal(toCP(1.9, 0, 0), 100);
  });
});

describe('fromCP', () => {
  it('breaks down copper into gp/sp/cp', () => {
    assert.deepEqual(fromCP(234), { gp: 2, sp: 3, cp: 4 });
    assert.deepEqual(fromCP(100), { gp: 1, sp: 0, cp: 0 });
    assert.deepEqual(fromCP(10),  { gp: 0, sp: 1, cp: 0 });
    assert.deepEqual(fromCP(1),   { gp: 0, sp: 0, cp: 1 });
  });

  it('handles zero', () => {
    assert.deepEqual(fromCP(0), { gp: 0, sp: 0, cp: 0 });
  });

  it('round-trips with toCP', () => {
    const original = { gp: 5, sp: 7, cp: 3 };
    assert.deepEqual(fromCP(toCP(original.gp, original.sp, original.cp)), original);
  });
});

describe('formatGold', () => {
  it('formats all denominations', () => {
    assert.equal(formatGold(2, 3, 4), '2 GP 3 SP 4 CP');
  });

  it('omits zero denominations', () => {
    assert.equal(formatGold(5, 0, 0), '5 GP');
    assert.equal(formatGold(0, 3, 0), '3 SP');
    assert.equal(formatGold(0, 0, 7), '7 CP');
  });

  it('returns 0 CP when all zero', () => {
    assert.equal(formatGold(0, 0, 0), '0 CP');
  });
});
