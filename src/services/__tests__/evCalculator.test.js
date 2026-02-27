import { describe, it, expect } from 'vitest';
import {
  runFinishSimulation,
  calculateSingleEventEV,
  calculateSeasonTotalEV,
} from '../evCalculator';

describe('runFinishSimulation', () => {
  it('returns 16 positions', () => {
    const dist = runFinishSimulation(0.5);
    expect(Object.keys(dist)).toHaveLength(16);
  });

  it('P(rank=1) equals winProb', () => {
    const dist = runFinishSimulation(0.25);
    expect(dist[1]).toBeCloseTo(0.25, 5);
  });

  it('probabilities sum to 1', () => {
    const dist = runFinishSimulation(0.1);
    const sum = Object.values(dist).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('higher win prob gives higher P(1st)', () => {
    const distLow = runFinishSimulation(0.05);
    const distHigh = runFinishSimulation(0.5);
    expect(distHigh[1]).toBeGreaterThan(distLow[1]);
  });
});

describe('calculateSingleEventEV', () => {
  it('returns positive EV for any valid odds', () => {
    const result = calculateSingleEventEV('+150');
    expect(result.singleEvent).toBeGreaterThan(0);
    expect(result.winProbability).toBeGreaterThan(0);
    expect(result.winProbability).toBeLessThan(100);
  });

  it('heavy favorite has higher EV than longshot', () => {
    const fav = calculateSingleEventEV('-200');
    const longshot = calculateSingleEventEV('+5000');
    expect(fav.singleEvent).toBeGreaterThan(longshot.singleEvent);
  });

  it('EV is capped at 100', () => {
    const result = calculateSingleEventEV('-10000');
    expect(result.singleEvent).toBeLessThanOrEqual(100);
  });

  it('returns perFinish breakdown', () => {
    const result = calculateSingleEventEV('+300');
    expect(result.perFinish).toBeDefined();
    expect(Object.keys(result.perFinish).length).toBeGreaterThan(0);
  });
});

describe('calculateSeasonTotalEV', () => {
  it('returns season total', () => {
    const result = calculateSeasonTotalEV('+200', 'standard', 1);
    expect(result.seasonTotal).toBeDefined();
    expect(result.seasonTotal).toBeGreaterThan(0);
  });

  it('includes eventsPerSeason', () => {
    const result = calculateSeasonTotalEV('+200', 'standard', 4);
    expect(result.eventsPerSeason).toBe(4);
  });
});
