/**
 * Commonly used keyboard codes (following KeyboardEvent.code).
 */
export const Keys = {
  // Movement & Direction
  KeyW: 'KeyW',
  KeyA: 'KeyA',
  KeyS: 'KeyS',
  KeyD: 'KeyD',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',

  // Actions & Controls
  Space: 'Space',
  Enter: 'Enter',
  Escape: 'Escape',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Delete: 'Delete',
  ShiftLeft: 'ShiftLeft',
  ShiftRight: 'ShiftRight',
  ControlLeft: 'ControlLeft',
  ControlRight: 'ControlRight',
  AltLeft: 'AltLeft',
  AltRight: 'AltRight',

  // Alphabetic Keys
  KeyE: 'KeyE',
  KeyQ: 'KeyQ',
  KeyR: 'KeyR',
  KeyF: 'KeyF',
  KeyC: 'KeyC',
  KeyZ: 'KeyZ',
  KeyX: 'KeyX',

  // Number Row
  Digit1: 'Digit1',
  Digit2: 'Digit2',
  Digit3: 'Digit3',
  Digit4: 'Digit4',
  Digit5: 'Digit5',
} as const;

/**
 * Standard or custom keyboard code.
 */
export type KeyCode = (typeof Keys)[keyof typeof Keys] | (string & {});

/**
 * Standard mouse buttons following DOM MouseEvent.button values.
 */
export enum MouseButton {
  Left = 0,
  Middle = 1,
  Right = 2,
  Back = 3,
  Forward = 4,
}

/**
 * Interface through which external platforms feed raw input events into the engine.
 */
export interface InputEventReceiver {
  feedKeyDown(key: KeyCode): void;
  feedKeyUp(key: KeyCode): void;
  feedMouseDown(button: MouseButton | number): void;
  feedMouseUp(button: MouseButton | number): void;
  feedMouseMove(x: number, y: number): void;
  feedMouseWheel(deltaX: number, deltaY: number): void;
  reset(): void;
}

/**
 * Interface for adapters that bind platform-specific events to the engine's receiver.
 */
export interface InputAdapter {
  attach(receiver: InputEventReceiver): void;
  detach(): void;
}
