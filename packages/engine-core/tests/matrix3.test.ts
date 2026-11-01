import { describe, it, expect } from 'vitest';
import { Matrix3 } from '../src/math/matrix3';
import { Vector2 } from '../src/math/vector2';

describe('Matrix3', () => {
  it('initializes to identity matrix', () => {
    const m = new Matrix3();
    const expected = [
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    ];
    expect(m.toArray()).toEqual(expected);
    expect(m.determinant()).toBe(1);
  });

  it('creates translation, rotation, and scaling matrices', () => {
    const t = Matrix3.translation(10, 20);
    const p1 = t.transformPoint(new Vector2(0, 0));
    expect(p1.x).toBe(10);
    expect(p1.y).toBe(20);

    const r = Matrix3.rotation(Math.PI / 2);
    const p2 = r.transformPoint(new Vector2(1, 0));
    expect(p2.x).toBeCloseTo(0, 5);
    expect(p2.y).toBeCloseTo(1, 5);

    const s = Matrix3.scaling(2, 3);
    const p3 = s.transformPoint(new Vector2(4, 5));
    expect(p3.x).toBe(8);
    expect(p3.y).toBe(15);
  });

  it('performs matrix multiplication correctly', () => {
    const t = Matrix3.translation(10, 0);
    const s = Matrix3.scaling(2, 2);

    // M = T * S : scale first, then translate
    const m = t.clone().multiply(s);
    const result = m.transformPoint(new Vector2(5, 5));
    expect(result.x).toBe(20); // (5 * 2) + 10
    expect(result.y).toBe(10); // (5 * 2) + 0

    // Multiplying by identity returns identical matrix
    const id = Matrix3.identity();
    expect(m.clone().multiply(id).equals(m)).toBe(true);
  });

  it('supports in-place translate, rotate, and scale chains', () => {
    const m = new Matrix3();
    m.translate(10, 20);
    m.scale(2, 2);

    const pt = m.transformPoint(new Vector2(3, 4));
    expect(pt.x).toBe(16); // 10 + 3*2
    expect(pt.y).toBe(28); // 20 + 4*2
  });

  it('composes Translation, Rotation, Scale, and Pivot via setTRS', () => {
    const m = new Matrix3();
    // Position (100, 200), rotate 90 deg, scale 2x, pivot at center (10, 10)
    m.setTRS(100, 200, Math.PI / 2, 2, 2, 10, 10);

    // Pivot point (10, 10) should map directly to position (100, 200)
    const pivotWorld = m.transformPoint(new Vector2(10, 10));
    expect(pivotWorld.x).toBeCloseTo(100, 4);
    expect(pivotWorld.y).toBeCloseTo(200, 4);
  });

  it('transforms direction vectors ignoring translation', () => {
    const m = Matrix3.translation(50, 100);
    m.rotate(Math.PI / 2);

    const dir = new Vector2(1, 0);
    const transformed = m.transformVector(dir);

    expect(transformed.x).toBeCloseTo(0, 5);
    expect(transformed.y).toBeCloseTo(1, 5);
  });

  it('calculates determinant and inverts correctly (M * M^-1 = I)', () => {
    const m = new Matrix3();
    m.translate(15, -25);
    m.rotate(0.75);
    m.scale(2.5, 1.8);

    expect(m.determinant()).not.toBe(0);

    const original = m.clone();
    const inverted = m.clone();
    const success = inverted.invert();
    expect(success).toBe(true);

    const identityCheck = original.multiply(inverted);
    expect(identityCheck.equals(Matrix3.identity(), 0.0001)).toBe(true);
  });

  it('handles non-invertible matrix gracefully', () => {
    const nonInvertible = new Matrix3([
      0, 0, 0,
      0, 0, 0,
      0, 0, 0,
    ]);

    expect(nonInvertible.determinant()).toBe(0);
    const success = nonInvertible.invert();
    expect(success).toBe(false);
    expect(nonInvertible.equals(Matrix3.identity())).toBe(true);
  });

  it('generates 2D orthographic projection matrix for WebGL NDC coordinates', () => {
    // Canvas: width 800, height 600. Bottom 0, Top 600.
    const ortho = Matrix3.orthographic(0, 800, 0, 600);

    // Center of screen (400, 300) must map to NDC center (0, 0)
    const center = ortho.transformPoint(new Vector2(400, 300));
    expect(center.x).toBeCloseTo(0, 5);
    expect(center.y).toBeCloseTo(0, 5);

    // Bottom-left (0, 0) maps to NDC (-1, -1)
    const bottomLeft = ortho.transformPoint(new Vector2(0, 0));
    expect(bottomLeft.x).toBeCloseTo(-1, 5);
    expect(bottomLeft.y).toBeCloseTo(-1, 5);

    // Top-right (800, 600) maps to NDC (1, 1)
    const topRight = ortho.transformPoint(new Vector2(800, 600));
    expect(topRight.x).toBeCloseTo(1, 5);
    expect(topRight.y).toBeCloseTo(1, 5);
  });
});
