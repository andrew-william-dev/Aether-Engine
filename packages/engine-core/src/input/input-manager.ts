import { Vector2 } from '../math/vector2';
import { InputEventReceiver, KeyCode, MouseButton } from './types';

/**
 * Manages input state tracking for keyboard and mouse across frame boundaries.
 * Fully decoupled from browser DOM APIs.
 */
export class InputManager implements InputEventReceiver {
  private readonly _heldKeys = new Set<string>();
  private readonly _pressedKeys = new Set<string>();
  private readonly _releasedKeys = new Set<string>();

  private readonly _heldMouseButtons = new Set<number>();
  private readonly _pressedMouseButtons = new Set<number>();
  private readonly _releasedMouseButtons = new Set<number>();

  private readonly _mousePosition = new Vector2(0, 0);
  private readonly _mouseDelta = new Vector2(0, 0);
  private readonly _mouseWheel = new Vector2(0, 0);

  // --- Keyboard Queries ---

  /**
   * Returns true if the key is currently held down.
   */
  public isKeyDown(key: KeyCode): boolean {
    return this._heldKeys.has(key);
  }

  /**
   * Returns true only on the frame the key was initially pressed down.
   */
  public isKeyPressed(key: KeyCode): boolean {
    return this._pressedKeys.has(key);
  }

  /**
   * Returns true only on the frame the key was released.
   */
  public isKeyReleased(key: KeyCode): boolean {
    return this._releasedKeys.has(key);
  }

  /**
   * Returns true if the key is currently not pressed.
   */
  public isKeyUp(key: KeyCode): boolean {
    return !this._heldKeys.has(key);
  }

  /**
   * Returns an array of all keys currently held down.
   */
  public getHeldKeys(): string[] {
    return Array.from(this._heldKeys);
  }

  /**
   * Returns an array of all keys pressed during the current frame.
   */
  public getPressedKeys(): string[] {
    return Array.from(this._pressedKeys);
  }

  /**
   * Returns an array of all keys released during the current frame.
   */
  public getReleasedKeys(): string[] {
    return Array.from(this._releasedKeys);
  }

  // --- Mouse Queries ---

  /**
   * Returns true if the mouse button is currently held down.
   */
  public isMouseButtonDown(button: MouseButton | number): boolean {
    return this._heldMouseButtons.has(button);
  }

  /**
   * Returns true only on the frame the mouse button was initially pressed down.
   */
  public isMouseButtonPressed(button: MouseButton | number): boolean {
    return this._pressedMouseButtons.has(button);
  }

  /**
   * Returns true only on the frame the mouse button was released.
   */
  public isMouseButtonReleased(button: MouseButton | number): boolean {
    return this._releasedMouseButtons.has(button);
  }

  /**
   * Returns true if the mouse button is currently not pressed.
   */
  public isMouseButtonUp(button: MouseButton | number): boolean {
    return !this._heldMouseButtons.has(button);
  }

  /**
   * Gets the current mouse position.
   */
  public getMousePosition(): Vector2 {
    return this._mousePosition.clone();
  }

  /**
   * Current mouse X coordinate.
   */
  public get mouseX(): number {
    return this._mousePosition.x;
  }

  /**
   * Current mouse Y coordinate.
   */
  public get mouseY(): number {
    return this._mousePosition.y;
  }

  /**
   * Gets mouse movement delta accumulated during this frame.
   */
  public getMouseDelta(): Vector2 {
    return this._mouseDelta.clone();
  }

  /**
   * Gets mouse wheel delta accumulated during this frame.
   */
  public getMouseWheel(): Vector2 {
    return this._mouseWheel.clone();
  }

  // --- Input Event Receiver (Feeds from platform / adapter) ---

  public feedKeyDown(key: KeyCode): void {
    if (!this._heldKeys.has(key)) {
      this._heldKeys.add(key);
      this._pressedKeys.add(key);
    }
  }

  public feedKeyUp(key: KeyCode): void {
    if (this._heldKeys.has(key)) {
      this._heldKeys.delete(key);
      this._releasedKeys.add(key);
    }
  }

  public feedMouseDown(button: MouseButton | number): void {
    if (!this._heldMouseButtons.has(button)) {
      this._heldMouseButtons.add(button);
      this._pressedMouseButtons.add(button);
    }
  }

  public feedMouseUp(button: MouseButton | number): void {
    if (this._heldMouseButtons.has(button)) {
      this._heldMouseButtons.delete(button);
      this._releasedMouseButtons.add(button);
    }
  }

  public feedMouseMove(x: number, y: number): void {
    this._mouseDelta.x += x - this._mousePosition.x;
    this._mouseDelta.y += y - this._mousePosition.y;
    this._mousePosition.set(x, y);
  }

  public feedMouseWheel(deltaX: number, deltaY: number): void {
    this._mouseWheel.x += deltaX;
    this._mouseWheel.y += deltaY;
  }

  // --- Frame Lifecycle Management ---

  /**
   * Called at the end of each frame to clear single-frame transitions
   * (pressed keys, released keys, and frame movement deltas).
   */
  public endFrame(): void {
    this._pressedKeys.clear();
    this._releasedKeys.clear();
    this._pressedMouseButtons.clear();
    this._releasedMouseButtons.clear();
    this._mouseDelta.set(0, 0);
    this._mouseWheel.set(0, 0);
  }

  /**
   * Completely resets all input states (clears held keys, held buttons, and frame deltas).
   * Useful when pausing the engine, switching scenes, or losing window focus.
   */
  public reset(): void {
    this._heldKeys.clear();
    this._pressedKeys.clear();
    this._releasedKeys.clear();
    this._heldMouseButtons.clear();
    this._pressedMouseButtons.clear();
    this._releasedMouseButtons.clear();
    this._mouseDelta.set(0, 0);
    this._mouseWheel.set(0, 0);
  }
}
