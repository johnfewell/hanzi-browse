import { describe, it, expect } from 'vitest';
import { generateMousePath } from './mouse-movement.js';

// Deterministic options: jitterAmount 0 removes the Math.random component so the
// path lies exactly on the ease-out curve.
const opts = { minSteps: 10, stepsPerPixel: 50, jitterAmount: 0, totalDuration: 200 };

describe('generateMousePath', () => {
  it('starts exactly at the start point and ends exactly at the target', () => {
    const path = generateMousePath(0, 0, 100, 0, opts);
    expect(path[0]).toMatchObject({ x: 0, y: 0 });
    expect(path[path.length - 1]).toMatchObject({ x: 100, y: 0 });
  });

  it('uses at least minSteps points (steps + 1)', () => {
    const path = generateMousePath(0, 0, 100, 0, opts); // distance 100, stepsPerPixel 50 -> 2, floored under minSteps
    expect(path.length).toBe(11); // minSteps(10) + 1
  });

  it('scales the number of steps with distance', () => {
    const path = generateMousePath(0, 0, 1000, 0, opts); // floor(1000/50)=20 steps
    expect(path.length).toBe(21);
  });

  it('moves monotonically toward the target along the ease-out curve', () => {
    const path = generateMousePath(0, 0, 100, 0, opts);
    for (let i = 1; i < path.length; i++) {
      expect(path[i].x).toBeGreaterThanOrEqual(path[i - 1].x);
    }
    // ease-out: large early progress, decelerating — first step covers >10% of the way
    expect(path[1].x).toBeGreaterThan(10);
  });

  it('splits the total duration evenly across steps', () => {
    const path = generateMousePath(0, 0, 100, 0, opts);
    expect(path[0].delay).toBeCloseTo(200 / 10);
  });
});
