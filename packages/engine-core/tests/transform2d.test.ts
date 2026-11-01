import { describe, it, expect } from 'vitest';
import { Transform2D } from '../src/math/transform2d';
import { Vector2 } from '../src/math/vector2';

describe('Transform2D', () => {
  it('initializes with default identity transform values', () => {
    const t = new Transform2D();
    expect(t.position.equals(new Vector2(0, 0))).toBe(true);
    expect(t.scale.equals(new Vector2(1, 1))).toBe(true);
    expect(t.pivot.equals(new Vector2(0, 0))).toBe(true);
    expect(t.rotation).toBe(0);
    expect(t.parent).toBeNull();
    expect(t.children.length).toBe(0);
  });

  it('updates local matrix and clears dirty flag on evaluation', () => {
    const t = new Transform2D();
    expect(t.isDirty).toBe(true);

    t.setPosition(50, 75);
    t.setRotation(Math.PI / 4);
    t.setScale(2, 3);

    const m = t.getLocalMatrix();
    expect(t.isLocalDirty).toBe(false);

    t.getWorldMatrix();
    expect(t.isDirty).toBe(false);

    // Transforming point (0, 0) should yield position (50, 75)
    const p = m.transformPoint(new Vector2(0, 0));
    expect(p.x).toBeCloseTo(50, 4);
    expect(p.y).toBeCloseTo(75, 4);
  });

  it('converts points between local and world space (transformPoint & inverseTransformPoint)', () => {
    const t = new Transform2D();
    t.setPosition(100, 200);
    t.setRotation(Math.PI / 2); // 90 degree rotation
    t.setScale(2, 2);

    const localPoint = new Vector2(10, 0);

    // In local space, (10, 0) rotated 90 deg = (0, 10), scaled 2x = (0, 20), translated (100, 200) = (100, 220)
    const worldPoint = t.transformPoint(localPoint);
    expect(worldPoint.x).toBeCloseTo(100, 4);
    expect(worldPoint.y).toBeCloseTo(220, 4);

    // Inverse transform must recover original local point (10, 0)
    const recoveredLocal = t.inverseTransformPoint(worldPoint);
    expect(recoveredLocal.x).toBeCloseTo(10, 4);
    expect(recoveredLocal.y).toBeCloseTo(0, 4);
  });

  it('propagates parent transformations to children hierarchically', () => {
    const parent = new Transform2D();
    const child = new Transform2D();

    parent.addChild(child);
    expect(child.parent).toBe(parent);
    expect(parent.children).toContain(child);

    // Parent moved to (100, 0)
    parent.setPosition(100, 0);

    // Child is at local (50, 0)
    child.setPosition(50, 0);

    // World position of child should be 100 + 50 = 150
    const childWorldOrigin = child.transformPoint(new Vector2(0, 0));
    expect(childWorldOrigin.x).toBeCloseTo(150, 4);
    expect(childWorldOrigin.y).toBeCloseTo(0, 4);

    // Rotate parent 90 degrees: child should orbit around parent!
    parent.setRotation(Math.PI / 2);
    const rotatedChildWorld = child.transformPoint(new Vector2(0, 0));
    expect(rotatedChildWorld.x).toBeCloseTo(100, 4); // parent.x + 0
    expect(rotatedChildWorld.y).toBeCloseTo(50, 4);  // parent.y + 50
  });

  it('correctly handles unparenting and reparenting', () => {
    const parent = new Transform2D();
    const child = new Transform2D();

    parent.addChild(child);
    expect(parent.children.length).toBe(1);

    child.setParent(null);
    expect(child.parent).toBeNull();
    expect(parent.children.length).toBe(0);

    // Moving parent no longer affects child
    parent.setPosition(500, 500);
    child.setPosition(10, 20);

    const worldPoint = child.transformPoint(new Vector2(0, 0));
    expect(worldPoint.x).toBe(10);
    expect(worldPoint.y).toBe(20);
  });

  it('supports pivot offsets', () => {
    const t = new Transform2D();
    t.setPosition(100, 100);
    t.setPivot(10, 10);
    t.setRotation(Math.PI); // 180 degrees around pivot (10, 10)

    // The pivot point itself (10, 10) should map to position (100, 100)
    const pivotInWorld = t.transformPoint(new Vector2(10, 10));
    expect(pivotInWorld.x).toBeCloseTo(100, 4);
    expect(pivotInWorld.y).toBeCloseTo(100, 4);
  });
});
