import { describe, it, expect } from 'vitest';
import { Engine } from '../src/core/engine';
import { ENGINE_VERSION } from '../src/version';

describe('Engine Core', () => {
  it('exposes the correct engine version', () => {
    expect(ENGINE_VERSION).toBe('0.1.0');
  });

  it('initializes and manages state transitions', () => {
    const engine = new Engine({ name: 'TestEngine' });
    expect(engine.state).toBe('uninitialized');
    expect(engine.name).toBe('TestEngine');

    engine.init();
    expect(engine.state).toBe('initialized');

    engine.start();
    expect(engine.state).toBe('running');

    engine.pause();
    expect(engine.state).toBe('paused');

    engine.resume();
    expect(engine.state).toBe('running');

    engine.stop();
    expect(engine.state).toBe('stopped');
  });

  it('increments frame count during running steps', () => {
    const engine = new Engine();
    engine.start();

    expect(engine.frameCount).toBe(0);
    engine.step(1 / 60);
    engine.step(1 / 60);
    expect(engine.frameCount).toBe(2);

    engine.pause();
    engine.step(1 / 60);
    expect(engine.frameCount).toBe(2);
  });
});
