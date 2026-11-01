/**
 * 2D Vector representation for position, velocity, and dimensions.
 */
export class Vector2 {
  public x: number;
  public y: number;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  static zero(): Vector2 {
    return new Vector2(0, 0);
  }

  static one(): Vector2 {
    return new Vector2(1, 1);
  }

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

  dot(other: Vector2): number {
    return this.x * other.x + this.y * other.y;
  }

  lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  length(): number {
    return Math.sqrt(this.lengthSquared());
  }

  normalize(): this {
    const len = this.length();
    if (len > 0) {
      this.x /= len;
      this.y /= len;
    }
    return this;
  }

  equals(other: Vector2, tolerance = 0.000001): boolean {
    return Math.abs(this.x - other.x) <= tolerance && Math.abs(this.y - other.y) <= tolerance;
  }
}
