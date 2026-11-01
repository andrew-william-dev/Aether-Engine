import { Matrix3 } from './matrix3';
import { Vector2 } from './vector2';

export interface Transform2DOptions {
  position?: Vector2;
  rotation?: number;
  scale?: Vector2;
  pivot?: Vector2;
}

/**
 * Encapsulates 2D affine transformation with position, rotation, scale, and pivot.
 * Supports hierarchical parent-child transforms and dirty-flag matrix caching.
 */
export class Transform2D {
  public readonly position: Vector2;
  public readonly scale: Vector2;
  public readonly pivot: Vector2;
  private _rotation = 0; // In radians

  private readonly _localMatrix = new Matrix3();
  private readonly _worldMatrix = new Matrix3();
  private readonly _inverseWorldMatrix = new Matrix3();

  private _isLocalDirty = true;
  private _isWorldDirty = true;
  private _isInverseWorldDirty = true;

  private _parent: Transform2D | null = null;
  private readonly _children: Transform2D[] = [];

  constructor(options: Transform2DOptions = {}) {
    this.position = options.position?.clone() ?? new Vector2(0, 0);
    this.scale = options.scale?.clone() ?? new Vector2(1, 1);
    this.pivot = options.pivot?.clone() ?? new Vector2(0, 0);
    this._rotation = options.rotation ?? 0;
  }

  // --- Getters & Setters ---

  get rotation(): number {
    return this._rotation;
  }

  set rotation(radians: number) {
    if (this._rotation !== radians) {
      this._rotation = radians;
      this.markDirty();
    }
  }

  get parent(): Transform2D | null {
    return this._parent;
  }

  get children(): ReadonlyArray<Transform2D> {
    return this._children;
  }

  get isLocalDirty(): boolean {
    return this._isLocalDirty;
  }

  get isWorldDirty(): boolean {
    return this._isWorldDirty;
  }

  get isDirty(): boolean {
    return this._isLocalDirty || this._isWorldDirty;
  }

  // --- Mutators with Dirty Notification ---

  setPosition(x: number, y: number): this {
    if (this.position.x !== x || this.position.y !== y) {
      this.position.set(x, y);
      this.markDirty();
    }
    return this;
  }

  setScale(sx: number, sy = sx): this {
    if (this.scale.x !== sx || this.scale.y !== sy) {
      this.scale.set(sx, sy);
      this.markDirty();
    }
    return this;
  }

  setPivot(px: number, py: number): this {
    if (this.pivot.x !== px || this.pivot.y !== py) {
      this.pivot.set(px, py);
      this.markDirty();
    }
    return this;
  }

  setRotation(radians: number): this {
    this.rotation = radians;
    return this;
  }

  translate(dx: number, dy: number): this {
    this.position.x += dx;
    this.position.y += dy;
    this.markDirty();
    return this;
  }

  rotate(dRadians: number): this {
    this._rotation += dRadians;
    this.markDirty();
    return this;
  }

  /**
   * Marks local and world matrices as needing recalculation, and recursively propagates to children.
   */
  public markDirty(): void {
    this._isLocalDirty = true;
    this._isWorldDirty = true;
    this._isInverseWorldDirty = true;

    for (const child of this._children) {
      child.markWorldDirty();
    }
  }

  private markWorldDirty(): void {
    if (!this._isWorldDirty) {
      this._isWorldDirty = true;
      this._isInverseWorldDirty = true;
      for (const child of this._children) {
        child.markWorldDirty();
      }
    }
  }

  // --- Hierarchy Management ---

  setParent(newParent: Transform2D | null): this {
    if (this._parent === newParent) {
      return this;
    }

    // Remove from existing parent's children
    if (this._parent) {
      const idx = this._parent._children.indexOf(this);
      if (idx !== -1) {
        this._parent._children.splice(idx, 1);
      }
    }

    this._parent = newParent;

    // Add to new parent's children
    if (newParent) {
      newParent._children.push(this);
    }

    this.markWorldDirty();
    return this;
  }

  addChild(child: Transform2D): this {
    child.setParent(this);
    return this;
  }

  removeChild(child: Transform2D): this {
    if (child._parent === this) {
      child.setParent(null);
    }
    return this;
  }

  // --- Matrix Evaluation ---

  /**
   * Returns the local transformation matrix, updating it if dirty.
   */
  getLocalMatrix(): Matrix3 {
    if (this._isLocalDirty) {
      this._localMatrix.setTRS(
        this.position.x,
        this.position.y,
        this._rotation,
        this.scale.x,
        this.scale.y,
        this.pivot.x,
        this.pivot.y
      );
      this._isLocalDirty = false;
    }
    return this._localMatrix;
  }

  /**
   * Returns the world transformation matrix, updating it and any parent transforms if dirty.
   */
  getWorldMatrix(): Matrix3 {
    if (this._parent && this._parent.isDirty) {
      this._parent.getWorldMatrix();
    }

    if (this._isWorldDirty || this._isLocalDirty) {
      const local = this.getLocalMatrix();
      if (this._parent) {
        this._worldMatrix.copy(this._parent.getWorldMatrix()).multiply(local);
      } else {
        this._worldMatrix.copy(local);
      }
      this._isWorldDirty = false;
      this._isInverseWorldDirty = true;
    }

    return this._worldMatrix;
  }

  /**
   * Transforms a local-space point into world space.
   */
  transformPoint(localPoint: Vector2, out = new Vector2()): Vector2 {
    return this.getWorldMatrix().transformPoint(localPoint, out);
  }

  /**
   * Transforms a world-space point into local space.
   */
  inverseTransformPoint(worldPoint: Vector2, out = new Vector2()): Vector2 {
    if (this._isInverseWorldDirty) {
      this._inverseWorldMatrix.copy(this.getWorldMatrix());
      this._inverseWorldMatrix.invert();
      this._isInverseWorldDirty = false;
    }
    return this._inverseWorldMatrix.transformPoint(worldPoint, out);
  }

  clone(): Transform2D {
    return new Transform2D({
      position: this.position,
      rotation: this._rotation,
      scale: this.scale,
      pivot: this.pivot,
    });
  }
}
