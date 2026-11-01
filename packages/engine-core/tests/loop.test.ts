import { describe, it, expect } from 'vitest';
import { GameLoop } from '../src/core/loop';
import { ManualFrameScheduler } from '../src/core/scheduler';

describe('GameLoop & FrameScheduler', () => {
  it('schedules frames and processes delta time with ManualFrameScheduler', () => {
    const scheduler = new ManualFrameScheduler();
    const loop = new GameLoop({ scheduler });

    const updates: number[] = [];
    const renders: number[] = [];

    loop.onUpdate((dt) => updates.push(dt));
    loop.onRender((interp) => renders.push(interp ?? 1));

    loop.start();
    expect(loop.isRunning).toBe(true);
    expect(scheduler.pendingFrameCount).toBe(1);

    // Advance 16ms (approx 60fps)
    scheduler.advance(16);
    expect(updates.length).toBe(1);
    expect(renders.length).toBe(1);
    expect(updates[0]).toBeCloseTo(0.016, 3);
    expect(loop.frameCount).toBe(1);

    // Advance another 33ms (approx 30fps)
    scheduler.advance(33);
    expect(updates.length).toBe(2);
    expect(updates[1]).toBeCloseTo(0.033, 3);
    expect(loop.frameCount).toBe(2);

    loop.stop();
    expect(loop.isRunning).toBe(false);
    expect(scheduler.pendingFrameCount).toBe(0);
  });

  it('clamps delta time to maxDeltaTime to prevent massive time jumps', () => {
    const scheduler = new ManualFrameScheduler();
    const loop = new GameLoop({ scheduler, maxDeltaTime: 0.1 }); // 100ms max

    let recordedDt = 0;
    loop.onUpdate((dt) => {
      recordedDt = dt;
    });

    loop.start();
    // Simulate a 5-second freeze (e.g. background tab or debugger breakpoint)
    scheduler.advance(5000);

    expect(recordedDt).toBe(0.1); // Clamped to maxDeltaTime!
    loop.stop();
  });

  it('prevents multiple simultaneous running loops', () => {
    const scheduler = new ManualFrameScheduler();
    const loop = new GameLoop({ scheduler });

    let tickCount = 0;
    loop.onUpdate(() => {
      tickCount++;
    });

    loop.start();
    loop.start(); // Second call should be a no-op
    loop.start(); // Third call should be a no-op

    expect(scheduler.pendingFrameCount).toBe(1); // Only ONE frame scheduled!

    scheduler.advance(16);
    expect(tickCount).toBe(1);

    loop.stop();
  });

  it('cancels scheduled frames properly when stopped', () => {
    const scheduler = new ManualFrameScheduler();
    const loop = new GameLoop({ scheduler });

    let tickCount = 0;
    loop.onUpdate(() => {
      tickCount++;
    });

    loop.start();
    expect(scheduler.pendingFrameCount).toBe(1);

    loop.stop();
    expect(scheduler.pendingFrameCount).toBe(0);

    // Advancing time now should execute nothing
    scheduler.advance(100);
    expect(tickCount).toBe(0);
  });

  it('supports unregistering update and render listeners', () => {
    const scheduler = new ManualFrameScheduler();
    const loop = new GameLoop({ scheduler });

    let updateA = 0;
    let updateB = 0;

    const unsubA = loop.onUpdate(() => updateA++);
    const unsubB = loop.onUpdate(() => updateB++);

    loop.step(1 / 60);
    expect(updateA).toBe(1);
    expect(updateB).toBe(1);

    unsubA(); // Remove listener A

    loop.step(1 / 60);
    expect(updateA).toBe(1); // Unchanged
    expect(updateB).toBe(2); // Incremented

    unsubB();
    loop.step(1 / 60);
    expect(updateB).toBe(2);
  });

  it('cleans up all listeners on dispose', () => {
    const loop = new GameLoop();
    let count = 0;
    loop.onUpdate(() => count++);
    loop.onRender(() => count++);

    loop.step(1 / 60);
    expect(count).toBe(2);

    loop.dispose();
    loop.step(1 / 60);
    expect(count).toBe(2); // No new invocations
  });
});
