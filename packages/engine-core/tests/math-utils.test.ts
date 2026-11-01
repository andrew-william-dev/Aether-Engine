import { describe, it, expect } from 'vitest';
import {
  approxEquals,
  clamp,
  DEG_TO_RAD,
  degToRad,
  lerp,
  normalizeAngle,
  RAD_TO_DEG,
  radToDeg,
} from '../src/math/math-utils';

describe('MathUtils', () => {
  it('converts degrees to radians and vice versa', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI, 5);
    expect(degToRad(90)).toBeCloseTo(Math.PI / 2, 5);
    expect(radToDeg(Math.PI)).toBeCloseTo(180, 5);
    expect(radToDeg(Math.PI / 2)).toBeCloseTo(90, 5);
    expect(DEG_TO_RAD * 180).toBeCloseTo(Math.PI, 5);
    expect(RAD_TO_DEG * Math.PI).toBeCloseTo(180, 5);
  });

  it('clamps values within bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('interpolates linearly with lerp', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
    expect(lerp(0, 50, 0)).toBe(0);
    expect(lerp(0, 50, 1)).toBe(50);
  });

  it('checks approximate equality with tolerance', () => {
    expect(approxEquals(1.0, 1.0000001)).toBe(true);
    expect(approxEquals(1.0, 1.01)).toBe(false);
    expect(approxEquals(1.0, 1.01, 0.05)).toBe(true);
  });

  it('normalizes angles to [-PI, PI]', () => {
    expect(normalizeAngle(0)).toBeCloseTo(0, 5);
    expect(normalizeAngle(Math.PI)).toBeCloseTo(Math.PI, 5);
    expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI, 5);
    expect(normalizeAngle(-3 * Math.PI)).toBeCloseTo(-Math.PI, 5);
    expect(normalizeAngle(5 * Math.PI / 2)).toBeCloseTo(Math.PI / 2, 5);
  });
});
