import { approxEquals, EPSILON, lerp } from './math-utils';

/**
 * 2D Vector representation for positions, directions, velocities, and dimensions.
 */
export class Vector2 {
  public x: number;
  public y: number;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  // --- Static Constructors ---

  static zero(): Vector2 {
    return new Vector2(0, 0);
  }

  static one(): Vector2 {
    return new Vector2(1, 1);
  }

  static up(): Vector2 {
    return new Vector2(0, 1);
  }

  static down(): Vector2 {
    return new Vector2(0, -1);
  }

  static left(): Vector2 {
    return new Vector2(-1, 0);
  }

  static right(): Vector2 {
    return new Vector2(1, 0);
  }

  /**
   * Creates a vector from an angle in radians and an optional length.
   */
  static fromAngle(radians: number, length = 1): Vector2 {
    return new Vector2(Math.cos(radians) * length, Math.sin(radians) * length);
  }

  // --- Assignment & Cloning ---

  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  copy(other: Vector2): this {
    this.x = other.x;
    this.y = other.y;
    return this;
  }

  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  // --- Arithmetic ---

  add(other: Vector2): this {
    this.x += other.x;
    this.y += other.y;
    return this;
  }

  subtract(other: Vector2): this {
    this.x -= other.x;
    this.y -= other.y;
    return this;
  }

  scale(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  /**
   * Component-wise multiplication with another vector.
   */
  multiply(other: Vector2): this {
    this.x *= other.x;
    this.y *= other.y;
    return this;
  }

  /**
   * Component-wise division with another vector.
   */
  divide(other: Vector2): this {
    this.x = other.x !== 0 ? this.x / other.x : 0;
    this.y = other.y !== 0 ? this.y / other.y : 0;
    return this;
  }

  negate(): this {
    this.x = -this.x;
    this.y = -this.y;
    return this;
  }

  // --- Products & Geometric Operations ---

  dot(other: Vector2): number {
    return this.x * other.x + this.y * other.y;
  }

  /**
   * 2D Cross product (returns scalar z-component of 3D cross product).
   */
  cross(other: Vector2): number {
    return this.x * other.y - this.y * other.x;
  }

  lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  length(): number {
    return Math.sqrt(this.lengthSquared());
  }

  normalize(): this {
    const len = this.length();
    if (len > EPSILON) {
      this.x /= len;
      this.y /= len;
    } else {
      this.x = 0;
      this.y = 0;
    }
    return this;
  }

  distanceSquared(other: Vector2): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return dx * dx + dy * dy;
  }

  distance(other: Vector2): number {
    return Math.sqrt(this.distanceSquared(other));
  }

  // --- Angles & Rotations ---

  /**
   * Returns the counter-clockwise angle of this vector from the positive X axis in radians.
   */
  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /**
   * Returns the signed angle between this vector and another vector in radians.
   */
  angleTo(other: Vector2): number {
    return Math.atan2(this.cross(other), this.dot(other));
  }

  /**
   * Rotates this vector counter-clockwise by an angle in radians.
   */
  rotate(radians: number): this {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const rx = this.x * cos - this.y * sin;
    const ry = this.x * sin + this.y * cos;
    this.x = rx;
    this.y = ry;
    return this;
  }

  /**
   * Returns a 90-degree counter-clockwise perpendicular vector (-y, x).
   */
  perpendicular(): this {
    const temp = this.x;
    this.x = -this.y;
    this.y = temp;
    return this;
  }

  // --- Interpolation ---

  /**
   * Linearly interpolates towards a target vector by factor alpha (0 <= alpha <= 1).
   */
  lerp(target: Vector2, alpha: number): this {
    this.x = lerp(this.x, target.x, alpha);
    this.y = lerp(this.y, target.y, alpha);
    return this;
  }

  // --- Utility & Comparison ---

  equals(other: Vector2, tolerance = EPSILON): boolean {
    return approxEquals(this.x, other.x, tolerance) && approxEquals(this.y, other.y, tolerance);
  }

  toArray(): [number, number] {
    return [this.x, this.y];
  }

  fromArray(arr: [number, number] | number[]): this {
    this.x = arr[0] ?? 0;
    this.y = arr[1] ?? 0;
    return this;
  }
}
