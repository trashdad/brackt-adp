import { describe, it, expect } from 'vitest';
import {
  americanToImpliedProbability,
  americanToDecimal,
  formatAmericanOdds,
  probabilityToAmerican,
  removeVig,
} from '../oddsConverter';

describe('americanToImpliedProbability', () => {
  it('converts negative odds', () => {
    expect(americanToImpliedProbability(-200)).toBeCloseTo(0.6667, 3);
    expect(americanToImpliedProbability(-150)).toBeCloseTo(0.6, 3);
  });

  it('converts positive odds', () => {
    expect(americanToImpliedProbability(200)).toBeCloseTo(0.3333, 3);
    expect(americanToImpliedProbability(100)).toBeCloseTo(0.5, 3);
  });

  it('handles string input', () => {
    expect(americanToImpliedProbability('+200')).toBeCloseTo(0.3333, 3);
    expect(americanToImpliedProbability('-150')).toBeCloseTo(0.6, 3);
  });

  it('returns 0 for NaN', () => {
    expect(americanToImpliedProbability('abc')).toBe(0);
    expect(americanToImpliedProbability(NaN)).toBe(0);
  });
});

describe('americanToDecimal', () => {
  it('converts negative odds', () => {
    expect(americanToDecimal(-200)).toBeCloseTo(1.5, 2);
  });

  it('converts positive odds', () => {
    expect(americanToDecimal(200)).toBeCloseTo(3.0, 2);
    expect(americanToDecimal(100)).toBeCloseTo(2.0, 2);
  });
});

describe('formatAmericanOdds', () => {
  it('adds + prefix for positive', () => {
    expect(formatAmericanOdds(200)).toBe('+200');
  });

  it('keeps - prefix for negative', () => {
    expect(formatAmericanOdds(-150)).toBe('-150');
  });

  it('returns -- for NaN', () => {
    expect(formatAmericanOdds('abc')).toBe('--');
  });
});

describe('probabilityToAmerican', () => {
  it('converts >50% to negative odds', () => {
    const result = probabilityToAmerican(0.6667);
    expect(result).toBeLessThan(0);
    expect(result).toBeCloseTo(-200, -1);
  });

  it('converts <50% to positive odds', () => {
    const result = probabilityToAmerican(0.3333);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeCloseTo(200, -1);
  });

  it('returns null for out-of-range', () => {
    expect(probabilityToAmerican(0)).toBeNull();
    expect(probabilityToAmerican(1)).toBeNull();
    expect(probabilityToAmerican(-0.1)).toBeNull();
  });
});

describe('removeVig', () => {
  it('returns empty for no sources', () => {
    const { vigFreeOdds, consensus } = removeVig({});
    expect(vigFreeOdds).toEqual({});
    expect(consensus).toBeNull();
  });

  it('returns consensus for multiple sources', () => {
    const { vigFreeOdds, consensus } = removeVig({
      draftkings: '+150',
      fanduel: '+160',
    });
    expect(consensus).toBeTruthy();
    expect(Object.keys(vigFreeOdds)).toHaveLength(2);
  });
});
