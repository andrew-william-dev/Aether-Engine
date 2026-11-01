import { describe, it, expect } from 'vitest';
import { Vector2 } from '../src/math/vector2';

describe('Vector2', () => {
  it('initializes with default zero or provided coordinates', () => {
    const v1 = new Vector2();
    expect(v1.x).toBe(0);
    expect(v1.y).toBe(0);

    const v2 = new Vector2(3, 4);
    expect(v2.x).toBe(3);
    expect(v2.y).toBe(4);
  });

  it('performs vector addition and subtraction correctly', () => {
    const a = new Vector2(2, 5);
    const b = new Vector2(1, -2);

    a.add(b);
    expect(a.x).toBe(3);
    expect(a.y).toBe(3);

    a.subtract(b);
    expect(a.x).toBe(2);
    expect(a.y).toBe(5);
  });

  it('scales vector coordinates by a scalar', () => {
    const v = new Vector2(3, 4);
    v.scale(2);
    expect(v.x).toBe(6);
    expect(v.y).toBe(8);
  });

  it('calculates length and normalization correctly', () => {
    const v = new Vector2(3, 4);
    expect(v.length()).toBe(5);

    v.normalize();
    expect(v.length()).toBeCloseTo(1, 5);
    expect(v.x).toBeCloseTo(0.6, 5);
    expect(v.y).toBeCloseTo(0.8, 5);
  });

  it('computes dot product accurately', () => {
    const a = new Vector2(1, 2);
    const b = new Vector2(3, 4);
    expect(a.dot(b)).toBe(11); // 1*3 + 2*4
  });
});
