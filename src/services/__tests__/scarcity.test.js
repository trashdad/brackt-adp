import { describe, it, expect } from 'vitest';
import { applyPositionalScarcity } from '../evCalculator';

describe('applyPositionalScarcity', () => {
  it('calculates adpScore and dropoffVelocity', () => {
    const entries = [
      { id: '1', name: 'A', ev: { seasonTotal: 50 }, drafted: false },
      { id: '2', name: 'B', ev: { seasonTotal: 40 }, drafted: false },
      { id: '3', name: 'C', ev: { seasonTotal: 30 }, drafted: false },
      { id: '4', name: 'D', ev: { seasonTotal: 10 }, drafted: false },
    ];

    applyPositionalScarcity(entries);

    expect(entries[0].adpScore).toBeDefined();
    expect(entries[0].dropoffVelocity).toBeDefined();
    
    // With 4 entries, velocity should be calculated
    entries.forEach(e => {
      expect(e.dropoffVelocity).toBeGreaterThanOrEqual(0);
    });
  });

  it('calculates velocity based on adpScore jumps', () => {
    // Large drop between B and C should increase velocity at B
    const entries = [
      { id: '1', name: 'A', adjSq: 1.0, ev: { seasonTotal: 100 }, drafted: false },
      { id: '2', name: 'B', adjSq: 1.0, ev: { seasonTotal: 90 }, drafted: false },
      { id: '3', name: 'C', adjSq: 1.0, ev: { seasonTotal: 50 }, drafted: false }, // Huge drop here
      { id: '4', name: 'D', adjSq: 1.0, ev: { seasonTotal: 45 }, drafted: false },
    ];

    applyPositionalScarcity(entries);
    
    // B's momentum (drop to C) is 40. Inertia (drop from A) is 10.
    // Velocity at B should be high (> 1.0)
    const velocityB = entries.find(e => e.id === '2').dropoffVelocity;
    expect(velocityB).toBeGreaterThan(1.5);
  });
});
