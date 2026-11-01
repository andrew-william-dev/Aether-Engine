import { describe, it, expect } from 'vitest';
import { Engine } from '../src/core/engine';
import { ManualFrameScheduler } from '../src/core/scheduler';
import { ENGINE_VERSION } from '../src/version';

describe('Engine Lifecycle & Management', () => {
  it('exposes the correct engine version and default properties', () => {
    expect(ENGINE_VERSION).toBe('0.1.0');
    const engine = new Engine({ name: 'AetherTest' });
    expect(engine.name).toBe('AetherTest');
    expect(engine.targetFps).toBe(60);
    expect(engine.fixedDeltaTime).toBeCloseTo(1 / 60, 5);
    expect(engine.state).toBe('uninitialized');
    expect(engine.frameCount).toBe(0);
    expect(engine.deltaTime).toBe(0);
    expect(engine.totalTime).toBe(0);
  });

  it('progresses through complete lifecycle: init -> start -> pause -> resume -> stop -> dispose', () => {
    const scheduler = new ManualFrameScheduler();
    const engine = new Engine({ scheduler });

    expect(engine.state).toBe('uninitialized');

    // 1. Initialize
    engine.init();
    expect(engine.state).toBe('initialized');

    // Calling init again is idempotent
    expect(() => engine.init()).not.toThrow();
    expect(engine.state).toBe('initialized');

    // 2. Start
    let updates = 0;
    engine.onUpdate(() => updates++);
    engine.start();
    expect(engine.state).toBe('running');

    scheduler.advance(16);
    expect(updates).toBe(1);
    expect(engine.frameCount).toBe(1);

    // 3. Pause
    engine.pause();
    expect(engine.state).toBe('paused');

    // Advancing while paused does NOT run updates
    scheduler.advance(500);
    expect(updates).toBe(1);

    // 4. Resume
    engine.resume();
    expect(engine.state).toBe('running');

    // Time during pause should NOT spike delta time
    scheduler.advance(16);
    expect(updates).toBe(2);
    expect(engine.deltaTime).toBeCloseTo(0.016, 3);

    // 5. Stop
    engine.stop();
    expect(engine.state).toBe('stopped');

    scheduler.advance(50);
    expect(updates).toBe(2);

    // Restarting after stop
    engine.start();
    expect(engine.state).toBe('running');
    scheduler.advance(16);
    expect(updates).toBe(3);

    // 6. Dispose
    engine.dispose();
    expect(engine.state).toBe('disposed');

    // Calling dispose again is idempotent
    expect(() => engine.dispose()).not.toThrow();
  });

  it('prevents multiple simultaneous loops when calling start multiple times', () => {
    const scheduler = new ManualFrameScheduler();
    const engine = new Engine({ scheduler });

    let updates = 0;
    engine.onUpdate(() => updates++);

    engine.start();
    engine.start();
    engine.start();

    expect(engine.state).toBe('running');
    expect(scheduler.pendingFrameCount).toBe(1);

    scheduler.advance(16);
    expect(updates).toBe(1);

    engine.stop();
  });

  it('throws an error if attempting lifecycle actions on a disposed engine', () => {
    const engine = new Engine();
    engine.dispose();
    expect(engine.state).toBe('disposed');

    expect(() => engine.init()).toThrowError(/Cannot initialize disposed engine/);
    expect(() => engine.start()).toThrowError(/Cannot start disposed engine/);
    expect(() => engine.pause()).toThrowError(/Cannot pause disposed engine/);
    expect(() => engine.resume()).toThrowError(/Cannot resume disposed engine/);
    expect(() => engine.stop()).toThrowError(/Cannot stop disposed engine/);
    expect(() => engine.step()).toThrowError(/Cannot step disposed engine/);
    expect(() => engine.onUpdate(() => {})).toThrowError(/Cannot register update callback on disposed engine/);
  });

  it('throws when calling init while running or paused', () => {
    const engine = new Engine();
    engine.start();
    expect(() => engine.init()).toThrowError(/Cannot initialize engine in state: running/);

    engine.pause();
    expect(() => engine.init()).toThrowError(/Cannot initialize engine in state: paused/);

    engine.stop();
    expect(() => engine.init()).not.toThrow();
  });

  it('supports deterministic manual stepping', () => {
    const engine = new Engine({ fixedDeltaTime: 0.02 });

    let recordedDt = 0;
    engine.onUpdate((dt) => {
      recordedDt = dt;
    });

    engine.step(); // Uses default fixedDeltaTime (0.02)
    expect(recordedDt).toBe(0.02);
    expect(engine.frameCount).toBe(1);

    engine.step(0.05); // Custom step
    expect(recordedDt).toBe(0.05);
    expect(engine.frameCount).toBe(2);
    expect(engine.totalTime).toBeCloseTo(0.07, 5);
  });

  it('executes both update and render callbacks in correct sequence', () => {
    const engine = new Engine();
    const executionOrder: string[] = [];

    engine.onUpdate(() => executionOrder.push('update'));
    engine.onRender(() => executionOrder.push('render'));

    engine.step(1 / 60);

    expect(executionOrder).toEqual(['update', 'render']);
  });
});
