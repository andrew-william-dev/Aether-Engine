import { approxEquals, EPSILON } from './math-utils';
import { Vector2 } from './vector2';

/**
 * 3x3 Transformation Matrix stored in column-major order.
 * Compatible with WebGL uniform upload via Float32Array.
 *
 * Matrix layout (column-major):
 * [0]  [3]  [6]      [ m00  m10  m20 ]
 * [1]  [4]  [7]  ->  [ m01  m11  m21 ]
 * [2]  [5]  [8]      [ m02  m12  m22 ]
 */
export class Matrix3 {
  public readonly elements: Float32Array;

  constructor(elements?: Float32Array | number[]) {
    this.elements = new Float32Array(9);
    if (elements && elements.length === 9) {
      this.elements.set(elements);
    } else {
      this.identity();
    }
  }

  // --- Static Constructors ---

  static identity(): Matrix3 {
    return new Matrix3();
  }

  static translation(x: number, y: number): Matrix3 {
    const m = new Matrix3();
    m.elements[6] = x;
    m.elements[7] = y;
    return m;
  }

  static rotation(radians: number): Matrix3 {
    const m = new Matrix3();
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    m.elements[0] = c;
    m.elements[1] = s;
    m.elements[3] = -s;
    m.elements[4] = c;
    return m;
  }

  static scaling(sx: number, sy: number): Matrix3 {
    const m = new Matrix3();
    m.elements[0] = sx;
    m.elements[4] = sy;
    return m;
  }

  /**
   * Creates a 2D orthographic projection matrix mapping coordinates from [left, top] to [right, bottom]
   * to WebGL Normalized Device Coordinates (NDC) [-1, 1].
   */
  static orthographic(left: number, right: number, bottom: number, top: number): Matrix3 {
    const m = new Matrix3();
    const w = right - left;
    const h = top - bottom;

    if (w === 0 || h === 0) {
      throw new Error('Invalid orthographic dimensions: width or height cannot be 0');
    }

    m.elements[0] = 2 / w;
    m.elements[1] = 0;
    m.elements[2] = 0;

    m.elements[3] = 0;
    m.elements[4] = 2 / h;
    m.elements[5] = 0;

    m.elements[6] = -(right + left) / w;
    m.elements[7] = -(top + bottom) / h;
    m.elements[8] = 1;

    return m;
  }

  // --- Core Operations ---

  identity(): this {
    const e = this.elements;
    e[0] = 1; e[1] = 0; e[2] = 0;
    e[3] = 0; e[4] = 1; e[5] = 0;
    e[6] = 0; e[7] = 0; e[8] = 1;
    return this;
  }

  set(
    m00: number, m01: number, m02: number,
    m10: number, m11: number, m12: number,
    m20: number, m21: number, m22: number
  ): this {
    const e = this.elements;
    e[0] = m00; e[1] = m01; e[2] = m02;
    e[3] = m10; e[4] = m11; e[5] = m12;
    e[6] = m20; e[7] = m21; e[8] = m22;
    return this;
  }

  copy(other: Matrix3): this {
    this.elements.set(other.elements);
    return this;
  }

  clone(): Matrix3 {
    return new Matrix3(this.elements);
  }

  /**
   * Multiplies this matrix by another matrix (this = this * other).
   */
  multiply(other: Matrix3): this {
    const a = this.elements;
    const b = other.elements;

    const a00 = a[0]!, a01 = a[1]!, a02 = a[2]!;
    const a10 = a[3]!, a11 = a[4]!, a12 = a[5]!;
    const a20 = a[6]!, a21 = a[7]!, a22 = a[8]!;

    const b00 = b[0]!, b01 = b[1]!, b02 = b[2]!;
    const b10 = b[3]!, b11 = b[4]!, b12 = b[5]!;
    const b20 = b[6]!, b21 = b[7]!, b22 = b[8]!;

    a[0] = a00 * b00 + a10 * b01 + a20 * b02;
    a[1] = a01 * b00 + a11 * b01 + a21 * b02;
    a[2] = a02 * b00 + a12 * b01 + a22 * b02;

    a[3] = a00 * b10 + a10 * b11 + a20 * b12;
    a[4] = a01 * b10 + a11 * b11 + a21 * b12;
    a[5] = a02 * b10 + a12 * b11 + a22 * b12;

    a[6] = a00 * b20 + a10 * b21 + a20 * b22;
    a[7] = a01 * b20 + a11 * b21 + a21 * b22;
    a[8] = a02 * b20 + a12 * b21 + a22 * b22;

    return this;
  }

  /**
   * Premultiplies this matrix by another matrix (this = other * this).
   */
  premultiply(other: Matrix3): this {
    const temp = other.clone();
    temp.multiply(this);
    this.copy(temp);
    return this;
  }

  /**
   * Composes a 2D Translation, Rotation, and Scale (TRS) with optional pivot into this matrix.
   */
  setTRS(tx: number, ty: number, rotation: number, sx: number, sy: number, pivotX = 0, pivotY = 0): this {
    const c = Math.cos(rotation);
    const s = Math.sin(rotation);
    const m0 = c * sx;
    const m1 = s * sx;
    const m3 = -s * sy;
    const m4 = c * sy;

    const e = this.elements;
    e[0] = m0;
    e[1] = m1;
    e[2] = 0;

    e[3] = m3;
    e[4] = m4;
    e[5] = 0;

    e[6] = tx - (pivotX * m0 + pivotY * m3);
    e[7] = ty - (pivotX * m1 + pivotY * m4);
    e[8] = 1;

    return this;
  }

  // --- Transformations ---

  /**
   * Applies a translation by (x, y) to this matrix.
   */
  translate(x: number, y: number): this {
    const e = this.elements;
    e[6] = e[0]! * x + e[3]! * y + e[6]!;
    e[7] = e[1]! * x + e[4]! * y + e[7]!;
    return this;
  }

  /**
   * Applies a 2D rotation in radians to this matrix.
   */
  rotate(radians: number): this {
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    const e = this.elements;

    const a0 = e[0]!, a1 = e[1]!;
    const a3 = e[3]!, a4 = e[4]!;

    e[0] = a0 * c + a3 * s;
    e[1] = a1 * c + a4 * s;
    e[3] = a0 * -s + a3 * c;
    e[4] = a1 * -s + a4 * c;

    return this;
  }

  /**
   * Applies scaling by (sx, sy) to this matrix.
   */
  scale(sx: number, sy: number): this {
    const e = this.elements;
    e[0] = e[0]! * sx;
    e[1] = e[1]! * sx;
    e[3] = e[3]! * sy;
    e[4] = e[4]! * sy;
    return this;
  }

  // --- Inversion & Determinant ---

  determinant(): number {
    const e = this.elements;
    const a00 = e[0]!, a01 = e[1]!, a02 = e[2]!;
    const a10 = e[3]!, a11 = e[4]!, a12 = e[5]!;
    const a20 = e[6]!, a21 = e[7]!, a22 = e[8]!;

    return (
      a00 * (a11 * a22 - a12 * a21) -
      a10 * (a01 * a22 - a02 * a21) +
      a20 * (a01 * a12 - a02 * a11)
    );
  }

  /**
   * Inverts this matrix in-place. If non-invertible, resets to identity and returns false.
   */
  invert(): boolean {
    const e = this.elements;
    const a00 = e[0]!, a01 = e[1]!, a02 = e[2]!;
    const a10 = e[3]!, a11 = e[4]!, a12 = e[5]!;
    const a20 = e[6]!, a21 = e[7]!, a22 = e[8]!;

    const b01 = a22 * a11 - a12 * a21;
    const b11 = -a22 * a10 + a12 * a20;
    const b21 = a21 * a10 - a11 * a20;

    const det = a00 * b01 + a01 * b11 + a02 * b21;

    if (Math.abs(det) < EPSILON) {
      this.identity();
      return false;
    }

    const invDet = 1.0 / det;

    e[0] = b01 * invDet;
    e[1] = (-a22 * a01 + a02 * a21) * invDet;
    e[2] = (a12 * a01 - a02 * a11) * invDet;

    e[3] = b11 * invDet;
    e[4] = (a22 * a00 - a02 * a20) * invDet;
    e[5] = (-a12 * a00 + a02 * a10) * invDet;

    e[6] = b21 * invDet;
    e[7] = (-a21 * a00 + a01 * a20) * invDet;
    e[8] = (a11 * a00 - a01 * a10) * invDet;

    return true;
  }

  // --- Vector Transformation ---

  /**
   * Transforms a 2D point (applying translation, rotation, and scaling).
   */
  transformPoint(point: Vector2, out = new Vector2()): Vector2 {
    const e = this.elements;
    const x = point.x;
    const y = point.y;

    const nx = e[0]! * x + e[3]! * y + e[6]!;
    const ny = e[1]! * x + e[4]! * y + e[7]!;
    const nw = e[2]! * x + e[5]! * y + e[8]!;

    if (nw !== 1 && Math.abs(nw) > EPSILON) {
      out.set(nx / nw, ny / nw);
    } else {
      out.set(nx, ny);
    }
    return out;
  }

  /**
   * Transforms a 2D direction vector (applies rotation and scaling, ignoring translation).
   */
  transformVector(vector: Vector2, out = new Vector2()): Vector2 {
    const e = this.elements;
    const x = vector.x;
    const y = vector.y;

    out.set(
      e[0]! * x + e[3]! * y,
      e[1]! * x + e[4]! * y
    );
    return out;
  }

  // --- Conversions & Equality ---

  equals(other: Matrix3, tolerance = EPSILON): boolean {
    const a = this.elements;
    const b = other.elements;
    for (let i = 0; i < 9; i++) {
      if (!approxEquals(a[i]!, b[i]!, tolerance)) {
        return false;
      }
    }
    return true;
  }

  toArray(): number[] {
    return Array.from(this.elements);
  }

  toFloat32Array(): Float32Array {
    return this.elements;
  }
}
