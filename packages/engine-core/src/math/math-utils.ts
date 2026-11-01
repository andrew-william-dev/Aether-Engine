/**
 * Common mathematical constants and utility functions.
 */

export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;
export const EPSILON = 1e-6;

/**
 * Converts degrees to radians.
 */
export function degToRad(degrees: number): number {
  return degrees * DEG_TO_RAD;
}

/**
 * Converts radians to degrees.
 */
export function radToDeg(radians: number): number {
  return radians * RAD_TO_DEG;
}

/**
 * Clamps a number between min and max bounds.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linearly interpolates between a and b by t (0 <= t <= 1).
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Checks if two floating point numbers are approximately equal within tolerance.
 */
export function approxEquals(a: number, b: number, tolerance = EPSILON): boolean {
  return Math.abs(a - b) <= tolerance;
}

/**
 * Normalizes an angle in radians to the range [-PI, PI].
 */
export function normalizeAngle(radians: number): number {
  let angle = radians % (2 * Math.PI);
  if (angle > Math.PI) {
    angle -= 2 * Math.PI;
  } else if (angle < -Math.PI) {
    angle += 2 * Math.PI;
  }
  return angle;
}
