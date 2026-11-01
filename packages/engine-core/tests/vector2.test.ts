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

  it('provides standard directional static vectors', () => {
    expect(Vector2.zero().equals(new Vector2(0, 0))).toBe(true);
    expect(Vector2.one().equals(new Vector2(1, 1))).toBe(true);
    expect(Vector2.up().equals(new Vector2(0, 1))).toBe(true);
    expect(Vector2.down().equals(new Vector2(0, -1))).toBe(true);
    expect(Vector2.left().equals(new Vector2(-1, 0))).toBe(true);
    expect(Vector2.right().equals(new Vector2(1, 0))).toBe(true);
  });

  it('constructs vectors from angles', () => {
    const vZero = Vector2.fromAngle(0, 5);
    expect(vZero.x).toBeCloseTo(5, 5);
    expect(vZero.y).toBeCloseTo(0, 5);

    const vHalfPi = Vector2.fromAngle(Math.PI / 2, 2);
    expect(vHalfPi.x).toBeCloseTo(0, 5);
    expect(vHalfPi.y).toBeCloseTo(2, 5);
  });

  it('performs vector addition, subtraction, multiplication, and division correctly', () => {
    const a = new Vector2(2, 5);
    const b = new Vector2(1, -2);

    a.add(b);
    expect(a.x).toBe(3);
    expect(a.y).toBe(3);

    a.subtract(b);
    expect(a.x).toBe(2);
    expect(a.y).toBe(5);

    a.multiply(new Vector2(3, 2));
    expect(a.x).toBe(6);
    expect(a.y).toBe(10);

    a.divide(new Vector2(2, 5));
    expect(a.x).toBe(3);
    expect(a.y).toBe(2);

    // Safe divide by zero
    a.divide(new Vector2(0, 0));
    expect(a.x).toBe(0);
    expect(a.y).toBe(0);
  });

  it('scales and negates vectors', () => {
    const v = new Vector2(3, -4);
    v.scale(2);
    expect(v.x).toBe(6);
    expect(v.y).toBe(-8);

    v.negate();
    expect(v.x).toBe(-6);
    expect(v.y).toBe(8);
  });

  it('calculates length, normalization, and zero-length safely', () => {
    const v = new Vector2(3, 4);
    expect(v.length()).toBe(5);
    expect(v.lengthSquared()).toBe(25);

    v.normalize();
    expect(v.length()).toBeCloseTo(1, 5);
    expect(v.x).toBeCloseTo(0.6, 5);
    expect(v.y).toBeCloseTo(0.8, 5);

    // Normalizing zero vector does not result in NaN
    const zero = new Vector2(0, 0).normalize();
    expect(zero.x).toBe(0);
    expect(zero.y).toBe(0);
    expect(Number.isNaN(zero.x)).toBe(false);
  });

  it('computes distance and distance squared accurately', () => {
    const a = new Vector2(1, 1);
    const b = new Vector2(4, 5);

    expect(a.distanceSquared(b)).toBe(25);
    expect(a.distance(b)).toBe(5);
  });

  it('computes dot and 2D cross product accurately', () => {
    const a = new Vector2(1, 2);
    const b = new Vector2(3, 4);

    expect(a.dot(b)).toBe(11); // 1*3 + 2*4
    expect(a.cross(b)).toBe(-2); // 1*4 - 2*3
  });

  it('calculates angles, angleTo, and rotation correctly', () => {
    const right = new Vector2(1, 0);
    const up = new Vector2(0, 1);

    expect(right.angle()).toBe(0);
    expect(up.angle()).toBeCloseTo(Math.PI / 2, 5);
    expect(right.angleTo(up)).toBeCloseTo(Math.PI / 2, 5);

    // Rotate (1, 0) by 90 degrees counter-clockwise
    right.rotate(Math.PI / 2);
    expect(right.x).toBeCloseTo(0, 5);
    expect(right.y).toBeCloseTo(1, 5);

    // Perpendicular vector
    const p = new Vector2(2, 3).perpendicular();
    expect(p.x).toBe(-3);
    expect(p.y).toBe(2);
  });

  it('performs linear interpolation (lerp)', () => {
    const start = new Vector2(0, 10);
    const end = new Vector2(100, 20);

    start.lerp(end, 0.5);
    expect(start.x).toBe(50);
    expect(start.y).toBe(15);
  });

  it('converts to and from arrays', () => {
    const v = new Vector2(7, 9);
    expect(v.toArray()).toEqual([7, 9]);

    const v2 = new Vector2().fromArray([42, 99]);
    expect(v2.x).toBe(42);
    expect(v2.y).toBe(99);
  });
});
