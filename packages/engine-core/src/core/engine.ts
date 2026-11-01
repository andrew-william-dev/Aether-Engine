import { GameLoop, RenderCallback, UpdateCallback } from './loop';
import { FrameScheduler } from './scheduler';

export interface EngineConfig {
  /**
   * Name of this engine instance.
   */
  name?: string;
  /**
   * Target frames per second.
   */
  targetFps?: number;
  /**
   * Fixed time step for physics or fixed updates (in seconds).
   * Default: 1 / 60.
   */
  fixedDeltaTime?: number;
  /**
   * Maximum allowed delta time per frame to prevent spiral of death.
   * Default: 0.25 seconds.
   */
  maxDeltaTime?: number;
  /**
   * Custom frame scheduler for testing or specialized environments.
   */
  scheduler?: FrameScheduler;
}

export type EngineState = 'uninitialized' | 'initialized' | 'running' | 'paused' | 'stopped' | 'disposed';

/**
 * Core engine orchestrator managing lifecycle transitions and the main game loop.
 */
export class Engine {
  public readonly name: string;
  public readonly targetFps: number;
  public readonly fixedDeltaTime: number;

  private _state: EngineState = 'uninitialized';
  private readonly _loop: GameLoop;

  constructor(config: EngineConfig = {}) {
    this.name = config.name ?? 'Aether Engine Instance';
    this.targetFps = config.targetFps ?? 60;
    this.fixedDeltaTime = config.fixedDeltaTime ?? 1 / 60;

    this._loop = new GameLoop({
      scheduler: config.scheduler,
      maxDeltaTime: config.maxDeltaTime,
    });
  }

  /**
   * Current lifecycle state of the engine.
   */
  public get state(): EngineState {
    return this._state;
  }

  /**
   * Underlying game loop instance.
   */
  public get loop(): GameLoop {
    return this._loop;
  }

  /**
   * Total number of frames completed by the engine.
   */
  public get frameCount(): number {
    return this._loop.frameCount;
  }

  /**
   * Delta time of the most recent frame in seconds.
   */
  public get deltaTime(): number {
    return this._loop.deltaTime;
  }

  /**
   * Total active running time in seconds.
   */
  public get totalTime(): number {
    return this._loop.totalTime;
  }

  /**
   * Approximate current frames per second.
   */
  public get fps(): number {
    return this._loop.fps;
  }

  /**
   * Initializes the engine and prepares systems.
   * Idempotent if already in 'initialized' state.
   */
  public init(): void {
    this.assertNotDisposed('initialize');

    if (this._state === 'initialized') {
      return;
    }

    if (this._state === 'running' || this._state === 'paused') {
      throw new Error(`Cannot initialize engine in state: ${this._state}`);
    }

    this._state = 'initialized';
  }

  /**
   * Starts the game loop.
   * Automatically initializes if currently uninitialized.
   * Safe against multiple simultaneous invocations.
   */
  public start(): void {
    this.assertNotDisposed('start');

    if (this._state === 'running') {
      return;
    }

    if (this._state === 'paused') {
      this.resume();
      return;
    }

    if (this._state === 'uninitialized') {
      this.init();
    }

    this._state = 'running';
    this._loop.start();
  }

  /**
   * Pauses the running game loop. Frame updates and render calls are suspended.
   */
  public pause(): void {
    this.assertNotDisposed('pause');

    if (this._state !== 'running') {
      return;
    }

    this._state = 'paused';
    this._loop.stop();
  }

  /**
   * Resumes the paused game loop. Resets delta time baseline so paused time is not counted.
   */
  public resume(): void {
    this.assertNotDisposed('resume');

    if (this._state !== 'paused') {
      return;
    }

    this._state = 'running';
    this._loop.resetTiming();
    this._loop.start();
  }

  /**
   * Stops the engine and halts the game loop.
   */
  public stop(): void {
    this.assertNotDisposed('stop');

    if (this._state === 'stopped') {
      return;
    }

    this._state = 'stopped';
    this._loop.stop();
  }

  /**
   * Disposes of the engine, cancels any pending loops, and releases resources.
   * Disposed engines cannot be reinitialized or restarted.
   */
  public dispose(): void {
    if (this._state === 'disposed') {
      return;
    }

    if (this._state === 'running' || this._state === 'paused') {
      this._loop.stop();
    }

    this._loop.dispose();
    this._state = 'disposed';
  }

  /**
   * Alias for `dispose()` to maintain backward compatibility.
   */
  public destroy(): void {
    this.dispose();
  }

  /**
   * Manually steps the simulation by one frame.
   * Useful for deterministic testing or frame-by-frame debugging.
   * @param manualDeltaTime Delta time in seconds (defaults to fixedDeltaTime).
   */
  public step(manualDeltaTime?: number): void {
    this.assertNotDisposed('step');
    this._loop.step(manualDeltaTime ?? this.fixedDeltaTime);
  }

  /**
   * Subscribes to the per-frame update phase.
   * @param callback Function receiving delta time in seconds.
   * @returns Unsubscribe function.
   */
  public onUpdate(callback: UpdateCallback): () => void {
    this.assertNotDisposed('register update callback on');
    return this._loop.onUpdate(callback);
  }

  /**
   * Subscribes to the per-frame render phase.
   * @param callback Function receiving optional interpolation factor.
   * @returns Unsubscribe function.
   */
  public onRender(callback: RenderCallback): () => void {
    this.assertNotDisposed('register render callback on');
    return this._loop.onRender(callback);
  }

  private assertNotDisposed(action: string): void {
    if (this._state === 'disposed') {
      throw new Error(`Cannot ${action} disposed engine`);
    }
  }
}
