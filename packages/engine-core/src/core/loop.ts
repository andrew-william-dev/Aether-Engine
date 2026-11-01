import { AutoFrameScheduler, FrameHandle, FrameScheduler } from './scheduler';

export type UpdateCallback = (deltaTime: number) => void;
export type RenderCallback = (interpolation?: number) => void;

export interface GameLoopConfig {
  /**
   * Custom frame scheduler (defaults to AutoFrameScheduler).
   */
  scheduler?: FrameScheduler;
  /**
   * Maximum allowed delta time in seconds to guard against spiral of death or huge pauses.
   * Default: 0.25 seconds (250ms).
   */
  maxDeltaTime?: number;
}

/**
 * Manages frame timing, update/render callback dispatching, and frame scheduling.
 */
export class GameLoop {
  private readonly _scheduler: FrameScheduler;
  private readonly _maxDeltaTime: number;

  private _isRunning = false;
  private _frameHandle: FrameHandle | null = null;
  private _lastTimestampMs: number | null = null;

  private _deltaTime = 0;
  private _totalTime = 0;
  private _frameCount = 0;
  private _fps = 0;

  // FPS calculation helpers
  private _fpsUpdateInterval = 0.5; // Update FPS display every 0.5 seconds
  private _fpsTimeAccumulator = 0;
  private _fpsFrameAccumulator = 0;

  private readonly _updateCallbacks = new Set<UpdateCallback>();
  private readonly _renderCallbacks = new Set<RenderCallback>();

  constructor(config: GameLoopConfig = {}) {
    this._scheduler = config.scheduler ?? new AutoFrameScheduler();
    this._maxDeltaTime = config.maxDeltaTime ?? 0.25;
  }

  public get isRunning(): boolean {
    return this._isRunning;
  }

  public get deltaTime(): number {
    return this._deltaTime;
  }

  public get totalTime(): number {
    return this._totalTime;
  }

  public get frameCount(): number {
    return this._frameCount;
  }

  public get fps(): number {
    return this._fps;
  }

  public get scheduler(): FrameScheduler {
    return this._scheduler;
  }

  /**
   * Registers a callback invoked during the update phase of each frame.
   * @param callback Function receiving delta time in seconds.
   * @returns Unsubscribe function.
   */
  public onUpdate(callback: UpdateCallback): () => void {
    this._updateCallbacks.add(callback);
    return () => {
      this._updateCallbacks.delete(callback);
    };
  }

  /**
   * Registers a callback invoked during the render phase of each frame.
   * @param callback Function receiving optional interpolation factor.
   * @returns Unsubscribe function.
   */
  public onRender(callback: RenderCallback): () => void {
    this._renderCallbacks.add(callback);
    return () => {
      this._renderCallbacks.delete(callback);
    };
  }

  /**
   * Starts the game loop. Guards against duplicate running loops.
   */
  public start(): void {
    if (this._isRunning) {
      return;
    }

    this._isRunning = true;
    this._lastTimestampMs = this._scheduler.now();

    const loopStep = (timestampMs: number): void => {
      if (!this._isRunning) {
        return;
      }

      this.tick(timestampMs);

      if (this._isRunning) {
        this._frameHandle = this._scheduler.requestFrame(loopStep);
      }
    };

    this._frameHandle = this._scheduler.requestFrame(loopStep);
  }

  /**
   * Stops the game loop and cancels any pending frame requests.
   */
  public stop(): void {
    if (!this._isRunning && this._frameHandle === null) {
      return;
    }

    this._isRunning = false;

    if (this._frameHandle !== null) {
      this._scheduler.cancelFrame(this._frameHandle);
      this._frameHandle = null;
    }

    this._lastTimestampMs = null;
  }

  /**
   * Resets the timing baseline to current time.
   * Useful when resuming from pause so delta time does not measure pause duration.
   */
  public resetTiming(): void {
    this._lastTimestampMs = this._scheduler.now();
    this._deltaTime = 0;
  }

  /**
   * Processes a single tick at the given timestamp.
   * @param timestampMs High-resolution frame timestamp in milliseconds.
   */
  public tick(timestampMs: number): void {
    if (this._lastTimestampMs === null) {
      this._lastTimestampMs = timestampMs;
    }

    let elapsedMs = timestampMs - this._lastTimestampMs;
    if (elapsedMs < 0 || Number.isNaN(elapsedMs)) {
      elapsedMs = 0;
    }

    let dt = elapsedMs / 1000;
    if (dt > this._maxDeltaTime) {
      dt = this._maxDeltaTime;
    }

    this._lastTimestampMs = timestampMs;
    this._deltaTime = dt;
    this._totalTime += dt;
    this._frameCount++;

    // Update FPS calculation
    this._fpsTimeAccumulator += dt;
    this._fpsFrameAccumulator++;
    if (this._fpsTimeAccumulator >= this._fpsUpdateInterval) {
      this._fps = Math.round(this._fpsFrameAccumulator / this._fpsTimeAccumulator);
      this._fpsTimeAccumulator = 0;
      this._fpsFrameAccumulator = 0;
    }

    // Execute update callbacks
    const updates = Array.from(this._updateCallbacks);
    for (const callback of updates) {
      callback(dt);
    }

    // Execute render callbacks
    const renders = Array.from(this._renderCallbacks);
    for (const callback of renders) {
      callback(1.0);
    }
  }

  /**
   * Manually steps the loop once by a given delta time in seconds.
   * Useful for deterministic testing or single-step debugging.
   */
  public step(manualDeltaTime = 1 / 60): void {
    this._deltaTime = manualDeltaTime;
    this._totalTime += manualDeltaTime;
    this._frameCount++;

    const updates = Array.from(this._updateCallbacks);
    for (const callback of updates) {
      callback(manualDeltaTime);
    }

    const renders = Array.from(this._renderCallbacks);
    for (const callback of renders) {
      callback(1.0);
    }
  }

  /**
   * Disposes of the loop, stops scheduling, and clears all callback listeners.
   */
  public dispose(): void {
    this.stop();
    this._updateCallbacks.clear();
    this._renderCallbacks.clear();
  }
}
