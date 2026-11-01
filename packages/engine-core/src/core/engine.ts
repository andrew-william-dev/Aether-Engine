export interface EngineConfig {
  name?: string;
  targetFps?: number;
  fixedDeltaTime?: number;
}

export type EngineState = 'uninitialized' | 'initialized' | 'running' | 'paused' | 'stopped';

export class Engine {
  public readonly name: string;
  public readonly targetFps: number;
  public readonly fixedDeltaTime: number;

  private _state: EngineState = 'uninitialized';
  private _frameCount = 0;

  constructor(config: EngineConfig = {}) {
    this.name = config.name ?? 'Aether Engine Instance';
    this.targetFps = config.targetFps ?? 60;
    this.fixedDeltaTime = config.fixedDeltaTime ?? 1 / 60;
  }

  get state(): EngineState {
    return this._state;
  }

  get frameCount(): number {
    return this._frameCount;
  }

  init(): void {
    if (this._state === 'initialized') {
      return;
    }
    if (this._state !== 'uninitialized' && this._state !== 'stopped') {
      throw new Error(`Cannot initialize engine in state: ${this._state}`);
    }
    this._frameCount = 0;
    this._state = 'initialized';
  }

  start(): void {
    if (this._state === 'uninitialized') {
      this.init();
    }
    this._state = 'running';
  }

  pause(): void {
    if (this._state === 'running') {
      this._state = 'paused';
    }
  }

  resume(): void {
    if (this._state === 'paused') {
      this._state = 'running';
    }
  }

  stop(): void {
    this._state = 'stopped';
  }

  destroy(): void {
    this._state = 'stopped';
    this._frameCount = 0;
  }

  /**
   * Executes a single simulation step.
   * @param deltaTime Elapsed time in seconds.
   */
  step(deltaTime: number): void {
    if (this._state !== 'running') {
      return;
    }
    this._frameCount++;
    // Future milestones will update systems, scene graph, and game components here.
  }
}
