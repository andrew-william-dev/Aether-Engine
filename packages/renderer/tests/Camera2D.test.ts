import { describe, expect, it } from 'vitest';
import { Vector2 } from '@aether/engine-core';
import { Camera2D } from '../src/camera/Camera2D';

describe('Camera2D', () => {
  it('maps the camera center to the center of the viewport in screen pixels', () => {
    const camera = new Camera2D(800, 600);
    camera.position.set(120, -40);
    camera.markDirty();

    const screenPosition = camera.worldToScreen(new Vector2(120, -40));

    expect(screenPosition.x).toBeCloseTo(400);
    expect(screenPosition.y).toBeCloseTo(300);
  });

  it('converts between world and screen coordinates with zoom', () => {
    const camera = new Camera2D(800, 600);
    camera.position.set(120, -40);
    camera.zoom = 2;
    camera.markDirty();

    const worldPosition = new Vector2(145, -10);
    const screenPosition = camera.worldToScreen(worldPosition);
    const restoredWorldPosition = camera.screenToWorld(screenPosition);

    expect(screenPosition.x).toBeCloseTo(450);
    expect(screenPosition.y).toBeCloseTo(360);
    expect(restoredWorldPosition.x).toBeCloseTo(worldPosition.x);
    expect(restoredWorldPosition.y).toBeCloseTo(worldPosition.y);
  });

  it('updates screen mapping after a viewport resize', () => {
    const camera = new Camera2D(800, 600);
    camera.position.set(0, 0);
    camera.setViewport(1000, 500);

    const screenPosition = camera.worldToScreen(Vector2.zero());

    expect(screenPosition.x).toBeCloseTo(500);
    expect(screenPosition.y).toBeCloseTo(250);
  });
});
