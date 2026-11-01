import { describe, it, expect } from 'vitest';
import { Engine } from '../src/core/engine';
import { ManualFrameScheduler } from '../src/core/scheduler';
import { DomEventTarget, DomInputAdapter } from '../src/input/dom-adapter';
import { InputManager } from '../src/input/input-manager';
import { Keys, MouseButton } from '../src/input/types';

describe('InputManager (Keyboard & Mouse)', () => {
  it('correctly tracks key press, held, and release states across frame boundaries', () => {
    const input = new InputManager();

    // Initial state
    expect(input.isKeyDown(Keys.KeyW)).toBe(false);
    expect(input.isKeyPressed(Keys.KeyW)).toBe(false);
    expect(input.isKeyReleased(Keys.KeyW)).toBe(false);
    expect(input.isKeyUp(Keys.KeyW)).toBe(true);

    // Frame 1: Key is pressed down
    input.feedKeyDown(Keys.KeyW);
    expect(input.isKeyDown(Keys.KeyW)).toBe(true);
    expect(input.isKeyPressed(Keys.KeyW)).toBe(true);
    expect(input.isKeyReleased(Keys.KeyW)).toBe(false);
    expect(input.isKeyUp(Keys.KeyW)).toBe(false);

    // Conclude Frame 1
    input.endFrame();

    // Frame 2: Key remains held down
    expect(input.isKeyDown(Keys.KeyW)).toBe(true);
    expect(input.isKeyPressed(Keys.KeyW)).toBe(false); // No longer "just pressed"
    expect(input.isKeyReleased(Keys.KeyW)).toBe(false);

    // Frame 3: Key is released
    input.feedKeyUp(Keys.KeyW);
    expect(input.isKeyDown(Keys.KeyW)).toBe(false);
    expect(input.isKeyPressed(Keys.KeyW)).toBe(false);
    expect(input.isKeyReleased(Keys.KeyW)).toBe(true); // "just released"
    expect(input.isKeyUp(Keys.KeyW)).toBe(true);

    // Conclude Frame 3
    input.endFrame();

    // Frame 4: Key is completely up
    expect(input.isKeyDown(Keys.KeyW)).toBe(false);
    expect(input.isKeyPressed(Keys.KeyW)).toBe(false);
    expect(input.isKeyReleased(Keys.KeyW)).toBe(false); // No longer "just released"
    expect(input.isKeyUp(Keys.KeyW)).toBe(true);
  });

  it('handles rapid key tap within the same frame without dropping transitions', () => {
    const input = new InputManager();

    // Key pressed and released in the exact same frame
    input.feedKeyDown(Keys.Space);
    input.feedKeyUp(Keys.Space);

    expect(input.isKeyPressed(Keys.Space)).toBe(true);
    expect(input.isKeyReleased(Keys.Space)).toBe(true);
    expect(input.isKeyDown(Keys.Space)).toBe(false);

    input.endFrame();
    expect(input.isKeyPressed(Keys.Space)).toBe(false);
    expect(input.isKeyReleased(Keys.Space)).toBe(false);
  });

  it('ignores OS repeated keydown events while key is already held', () => {
    const input = new InputManager();

    input.feedKeyDown(Keys.KeyA);
    input.endFrame();

    // OS repeat event arrives while key is still held
    input.feedKeyDown(Keys.KeyA);
    expect(input.isKeyDown(Keys.KeyA)).toBe(true);
    expect(input.isKeyPressed(Keys.KeyA)).toBe(false); // Must not re-trigger pressed
  });

  it('tracks mouse buttons across frames', () => {
    const input = new InputManager();

    expect(input.isMouseButtonDown(MouseButton.Left)).toBe(false);
    expect(input.isMouseButtonUp(MouseButton.Left)).toBe(true);

    // Press left click
    input.feedMouseDown(MouseButton.Left);
    expect(input.isMouseButtonDown(MouseButton.Left)).toBe(true);
    expect(input.isMouseButtonPressed(MouseButton.Left)).toBe(true);
    expect(input.isMouseButtonReleased(MouseButton.Left)).toBe(false);

    input.endFrame();
    expect(input.isMouseButtonDown(MouseButton.Left)).toBe(true);
    expect(input.isMouseButtonPressed(MouseButton.Left)).toBe(false);

    // Release left click
    input.feedMouseUp(MouseButton.Left);
    expect(input.isMouseButtonDown(MouseButton.Left)).toBe(false);
    expect(input.isMouseButtonReleased(MouseButton.Left)).toBe(true);

    input.endFrame();
    expect(input.isMouseButtonReleased(MouseButton.Left)).toBe(false);
  });

  it('tracks mouse position, movement delta, and wheel scroll', () => {
    const input = new InputManager();

    expect(input.mouseX).toBe(0);
    expect(input.mouseY).toBe(0);

    input.feedMouseMove(100, 150);
    expect(input.mouseX).toBe(100);
    expect(input.mouseY).toBe(150);
    expect(input.getMouseDelta().x).toBe(100);
    expect(input.getMouseDelta().y).toBe(150);

    // Subsequent movement in same frame accumulates delta
    input.feedMouseMove(120, 160);
    expect(input.mouseX).toBe(120);
    expect(input.mouseY).toBe(160);
    expect(input.getMouseDelta().x).toBe(120);
    expect(input.getMouseDelta().y).toBe(160);

    input.feedMouseWheel(0, 50);
    expect(input.getMouseWheel().y).toBe(50);

    // Conclude frame
    input.endFrame();

    // Position persists, deltas reset
    expect(input.mouseX).toBe(120);
    expect(input.mouseY).toBe(160);
    expect(input.getMouseDelta().x).toBe(0);
    expect(input.getMouseDelta().y).toBe(0);
    expect(input.getMouseWheel().y).toBe(0);

    // Next frame relative movement
    input.feedMouseMove(130, 150);
    expect(input.getMouseDelta().x).toBe(10);
    expect(input.getMouseDelta().y).toBe(-10);
  });

  it('resets all held keys, buttons, and deltas safely on reset()', () => {
    const input = new InputManager();

    input.feedKeyDown(Keys.KeyW);
    input.feedMouseDown(MouseButton.Right);
    input.feedMouseMove(50, 50);
    input.feedMouseWheel(10, 20);

    expect(input.isKeyDown(Keys.KeyW)).toBe(true);
    expect(input.isMouseButtonDown(MouseButton.Right)).toBe(true);

    input.reset();

    expect(input.isKeyDown(Keys.KeyW)).toBe(false);
    expect(input.isKeyPressed(Keys.KeyW)).toBe(false);
    expect(input.isMouseButtonDown(MouseButton.Right)).toBe(false);
    expect(input.getMouseDelta().x).toBe(0);
    expect(input.getMouseWheel().x).toBe(0);
    expect(input.getHeldKeys().length).toBe(0);
  });
});

describe('DomInputAdapter', () => {
  class MockEventTarget implements DomEventTarget {
    private listeners = new Map<string, Set<(e: any) => void>>();

    addEventListener(type: string, listener: (e: any) => void): void {
      if (!this.listeners.has(type)) {
        this.listeners.set(type, new Set());
      }
      this.listeners.get(type)!.add(listener);
    }

    removeEventListener(type: string, listener: (e: any) => void): void {
      this.listeners.get(type)?.delete(listener);
    }

    dispatchEvent(type: string, event: any): void {
      this.listeners.get(type)?.forEach((cb) => cb(event));
    }

    listenerCount(type: string): number {
      return this.listeners.get(type)?.size ?? 0;
    }

    getBoundingClientRect() {
      return { left: 100, top: 50, width: 800, height: 600 };
    }
  }

  it('listens to DOM events and translates them to InputManager', () => {
    const mockTarget = new MockEventTarget();
    const adapter = new DomInputAdapter({
      target: mockTarget,
      keyboardTarget: mockTarget,
      preventDefaultKeys: ['Space'],
    });

    const input = new InputManager();
    adapter.attach(input);
    expect(adapter.isAttached).toBe(true);

    // Key event with preventDefault check
    let defaultPrevented = false;
    mockTarget.dispatchEvent('keydown', {
      code: 'Space',
      preventDefault: () => {
        defaultPrevented = true;
      },
    });

    expect(input.isKeyPressed(Keys.Space)).toBe(true);
    expect(defaultPrevented).toBe(true);

    // Mouse event with relative coordinate offset
    mockTarget.dispatchEvent('mousemove', {
      clientX: 250, // 250 - rect.left (100) = 150
      clientY: 120, // 120 - rect.top (50) = 70
    });

    expect(input.mouseX).toBe(150);
    expect(input.mouseY).toBe(70);

    // Detach removes listeners and resets input
    adapter.detach();
    expect(adapter.isAttached).toBe(false);
    expect(mockTarget.listenerCount('keydown')).toBe(0);
    expect(mockTarget.listenerCount('mousemove')).toBe(0);
    expect(input.isKeyDown(Keys.Space)).toBe(false);
  });
});

describe('Engine & Input Integration', () => {
  it('automatically clears single-frame input transitions at the end of each frame', () => {
    const scheduler = new ManualFrameScheduler();
    const engine = new Engine({ scheduler });

    engine.start();

    // User presses Escape
    engine.input.feedKeyDown(Keys.Escape);
    expect(engine.input.isKeyPressed(Keys.Escape)).toBe(true);
    expect(engine.input.isKeyDown(Keys.Escape)).toBe(true);

    // Advance 1 frame in game loop
    scheduler.advance(16);

    // Frame transition completed: key is still held down, but no longer just-pressed!
    expect(engine.input.isKeyPressed(Keys.Escape)).toBe(false);
    expect(engine.input.isKeyDown(Keys.Escape)).toBe(true);

    engine.stop();
  });

  it('resets held inputs when the engine pauses or stops', () => {
    const scheduler = new ManualFrameScheduler();
    const engine = new Engine({ scheduler });

    engine.start();
    engine.input.feedKeyDown(Keys.KeyW);
    expect(engine.input.isKeyDown(Keys.KeyW)).toBe(true);

    // Pausing resets held inputs to avoid stuck keys
    engine.pause();
    expect(engine.input.isKeyDown(Keys.KeyW)).toBe(false);

    engine.resume();
    engine.input.feedKeyDown(Keys.KeyD);
    expect(engine.input.isKeyDown(Keys.KeyD)).toBe(true);

    // Stopping resets held inputs
    engine.stop();
    expect(engine.input.isKeyDown(Keys.KeyD)).toBe(false);
  });
});
