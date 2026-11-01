/**
 * Callback signature invoked on each frame tick.
 * @param timestampMs Current high-resolution timestamp in milliseconds.
 */
export type FrameCallback = (timestampMs: number) => void;

/**
 * Handle returned by requestFrame for cancellation.
 */
export type FrameHandle = number | ReturnType<typeof setTimeout>;

/**
 * Pluggable frame scheduler interface.
 * Decouples the engine game loop from platform-specific APIs (browser requestAnimationFrame vs Node.js vs test mock).
 */
export interface FrameScheduler {
  /**
   * Request a callback to be invoked on the next animation frame.
   */
  requestFrame(callback: FrameCallback): FrameHandle;

  /**
   * Cancel a previously scheduled frame callback.
   */
  cancelFrame(handle: FrameHandle): void;

  /**
   * Get the current high-resolution timestamp in milliseconds.
   */
  now(): number;
}

/**
 * Default frame scheduler for runtime environments.
 * Uses `requestAnimationFrame` if available in global scope, falling back to `setTimeout` for headless Node.js.
 */
export class AutoFrameScheduler implements FrameScheduler {
  public now(): number {
    if (typeof globalThis.performance !== 'undefined' && typeof globalThis.performance.now === 'function') {
      return globalThis.performance.now();
    }
    return Date.now();
  }

  public requestFrame(callback: FrameCallback): FrameHandle {
    if (typeof globalThis.requestAnimationFrame === 'function') {
      return globalThis.requestAnimationFrame(callback);
    }
    return setTimeout(() => {
      callback(this.now());
    }, 1000 / 60);
  }

  public cancelFrame(handle: FrameHandle): void {
    if (typeof globalThis.cancelAnimationFrame === 'function' && typeof handle === 'number') {
      globalThis.cancelAnimationFrame(handle);
      return;
    }
    clearTimeout(handle as ReturnType<typeof setTimeout>);
  }
}

/**
 * Deterministic frame scheduler for unit testing and headless simulation.
 * Allows manually advancing time and executing scheduled frames without real-world timers.
 */
export class ManualFrameScheduler implements FrameScheduler {
  private _currentTimeMs = 0;
  private _nextHandle = 1;
  private _pendingCallbacks = new Map<number, FrameCallback>();

  public now(): number {
    return this._currentTimeMs;
  }

  public requestFrame(callback: FrameCallback): FrameHandle {
    const handle = this._nextHandle++;
    this._pendingCallbacks.set(handle, callback);
    return handle;
  }

  public cancelFrame(handle: FrameHandle): void {
    if (typeof handle === 'number') {
      this._pendingCallbacks.delete(handle);
    }
  }

  public get pendingFrameCount(): number {
    return this._pendingCallbacks.size;
  }

  /**
   * Advances simulated time by deltaMs and flushes any pending frame callbacks.
   * @param deltaMs Elapsed time to add in milliseconds.
   */
  public advance(deltaMs: number): void {
    if (deltaMs < 0) {
      throw new Error(`Cannot advance negative time: ${deltaMs}`);
    }
    this._currentTimeMs += deltaMs;
    this.flush();
  }

  /**
   * Advances simulated time to a target timestamp and flushes any pending frame callbacks.
   * @param targetTimestampMs Target timestamp in milliseconds.
   */
  public advanceTo(targetTimestampMs: number): void {
    if (targetTimestampMs < this._currentTimeMs) {
      throw new Error(
        `Cannot advance backwards: current=${this._currentTimeMs}, target=${targetTimestampMs}`
      );
    }
    this._currentTimeMs = targetTimestampMs;
    this.flush();
  }

  /**
   * Executes currently scheduled frame callbacks using the current simulated time.
   */
  public flush(): void {
    if (this._pendingCallbacks.size === 0) {
      return;
    }
    // Copy callbacks before executing so new requests during flush are deferred to next frame
    const callbacks = Array.from(this._pendingCallbacks.values());
    this._pendingCallbacks.clear();
    for (const callback of callbacks) {
      callback(this._currentTimeMs);
    }
  }

  /**
   * Resets scheduler state to 0ms and clears all pending callbacks.
   */
  public reset(): void {
    this._currentTimeMs = 0;
    this._pendingCallbacks.clear();
  }
}
