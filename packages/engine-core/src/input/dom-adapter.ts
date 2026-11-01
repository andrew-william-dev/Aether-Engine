import { InputAdapter, InputEventReceiver, MouseButton } from './types';

/**
 * Minimal interface representing DOM event targets without requiring browser runtime.
 */
export interface DomEventTarget {
  addEventListener(type: string, listener: (event: any) => void, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: (event: any) => void, options?: boolean | EventListenerOptions): void;
  getBoundingClientRect?(): { left: number; top: number; width: number; height: number };
}

export interface DomInputAdapterOptions {
  /**
   * Target element for mouse events (e.g. canvas or viewport element).
   * Defaults to globalThis.window if available.
   */
  target?: DomEventTarget | null;

  /**
   * Target element for keyboard events.
   * Defaults to globalThis.window if available.
   */
  keyboardTarget?: DomEventTarget | null;

  /**
   * Key codes to prevent browser default action for (e.g. ['Space', 'ArrowUp', 'ArrowDown']).
   */
  preventDefaultKeys?: string[];
}

/**
 * Adapter that listens to DOM events and forwards them to an InputEventReceiver.
 * Decouples the DOM from the engine core.
 */
export class DomInputAdapter implements InputAdapter {
  private _receiver: InputEventReceiver | null = null;
  private readonly _target: DomEventTarget | null;
  private readonly _keyboardTarget: DomEventTarget | null;
  private readonly _preventDefaultKeys: Set<string>;

  private _isAttached = false;

  // Bound handler references for clean removal
  private readonly _onKeyDown: (e: KeyboardEvent) => void;
  private readonly _onKeyUp: (e: KeyboardEvent) => void;
  private readonly _onMouseDown: (e: MouseEvent) => void;
  private readonly _onMouseUp: (e: MouseEvent) => void;
  private readonly _onMouseMove: (e: MouseEvent) => void;
  private readonly _onWheel: (e: WheelEvent) => void;
  private readonly _onBlur: () => void;

  constructor(options: DomInputAdapterOptions = {}) {
    const defaultWindow = typeof globalThis.window !== 'undefined' ? (globalThis.window as unknown as DomEventTarget) : null;

    this._target = options.target ?? defaultWindow;
    this._keyboardTarget = options.keyboardTarget ?? options.target ?? defaultWindow;
    this._preventDefaultKeys = new Set(options.preventDefaultKeys ?? ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

    this._onKeyDown = (e: KeyboardEvent) => {
      if (!this._receiver) return;
      if (this._preventDefaultKeys.has(e.code)) {
        e.preventDefault();
      }
      this._receiver.feedKeyDown(e.code);
    };

    this._onKeyUp = (e: KeyboardEvent) => {
      if (!this._receiver) return;
      if (this._preventDefaultKeys.has(e.code)) {
        e.preventDefault();
      }
      this._receiver.feedKeyUp(e.code);
    };

    this._onMouseDown = (e: MouseEvent) => {
      if (!this._receiver) return;
      this._receiver.feedMouseDown(e.button as MouseButton);
    };

    this._onMouseUp = (e: MouseEvent) => {
      if (!this._receiver) return;
      this._receiver.feedMouseUp(e.button as MouseButton);
    };

    this._onMouseMove = (e: MouseEvent) => {
      if (!this._receiver) return;

      let x = e.clientX;
      let y = e.clientY;

      // Translate to element-relative coordinates if getBoundingClientRect exists
      if (this._target && typeof this._target.getBoundingClientRect === 'function') {
        const rect = this._target.getBoundingClientRect();
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
      }

      this._receiver.feedMouseMove(x, y);
    };

    this._onWheel = (e: WheelEvent) => {
      if (!this._receiver) return;
      this._receiver.feedMouseWheel(e.deltaX, e.deltaY);
    };

    this._onBlur = () => {
      if (!this._receiver) return;
      this._receiver.reset();
    };
  }

  public get isAttached(): boolean {
    return this._isAttached;
  }

  public attach(receiver: InputEventReceiver): void {
    if (this._isAttached) {
      this.detach();
    }

    this._receiver = receiver;

    if (this._keyboardTarget) {
      this._keyboardTarget.addEventListener('keydown', this._onKeyDown);
      this._keyboardTarget.addEventListener('keyup', this._onKeyUp);
    }

    if (this._target) {
      this._target.addEventListener('mousedown', this._onMouseDown);
      this._target.addEventListener('mouseup', this._onMouseUp);
      this._target.addEventListener('mousemove', this._onMouseMove);
      this._target.addEventListener('wheel', this._onWheel, { passive: true });
    }

    if (typeof globalThis.window !== 'undefined') {
      globalThis.window.addEventListener('blur', this._onBlur);
    }

    this._isAttached = true;
  }

  public detach(): void {
    if (!this._isAttached) {
      return;
    }

    if (this._keyboardTarget) {
      this._keyboardTarget.removeEventListener('keydown', this._onKeyDown);
      this._keyboardTarget.removeEventListener('keyup', this._onKeyUp);
    }

    if (this._target) {
      this._target.removeEventListener('mousedown', this._onMouseDown);
      this._target.removeEventListener('mouseup', this._onMouseUp);
      this._target.removeEventListener('mousemove', this._onMouseMove);
      this._target.removeEventListener('wheel', this._onWheel);
    }

    if (typeof globalThis.window !== 'undefined') {
      globalThis.window.removeEventListener('blur', this._onBlur);
    }

    if (this._receiver) {
      this._receiver.reset();
      this._receiver = null;
    }

    this._isAttached = false;
  }
}
