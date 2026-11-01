import { Matrix3, Vector2 } from '@aether/engine-core';

/**
 * 2D orthographic camera producing a combined view-projection matrix
 * ready for upload to the GPU as a `mat3` uniform.
 *
 * The view-projection matrix maps world-space coordinates to WebGL NDC
 * (Normalized Device Coordinates), accounting for camera position and zoom.
 *
 * Usage:
 * ```ts
 * const camera = new Camera2D(800, 600);
 * camera.position.set(100, 50);
 * camera.zoom = 2.0;
 *
 * // Inside onRender():
 * batch.begin(camera.getViewProjectionMatrix());
 * ```
 */
export class Camera2D {
  /** World-space position of the camera center. */
  public readonly position: Vector2;

  /** Zoom factor. Values > 1 zoom in (objects appear larger). Default: 1. */
  public zoom: number;

  private _vpMatrix: Matrix3;
  private _isDirty = true;
  private _viewportWidth: number;
  private _viewportHeight: number;

  constructor(viewportWidth = 800, viewportHeight = 600) {
    this._viewportWidth = viewportWidth;
    this._viewportHeight = viewportHeight;
    this.position = new Vector2(0, 0);
    this.zoom = 1.0;
    this._vpMatrix = new Matrix3();
  }

  /** Viewport width in pixels. */
  get viewportWidth(): number {
    return this._viewportWidth;
  }

  /** Viewport height in pixels. */
  get viewportHeight(): number {
    return this._viewportHeight;
  }

  /**
   * Updates viewport dimensions and marks the matrix dirty.
   * Call this when the canvas is resized.
   */
  setViewport(width: number, height: number): void {
    this._viewportWidth = width;
    this._viewportHeight = height;
    this._isDirty = true;
  }

  /**
   * Marks the view-projection matrix as needing recalculation.
   * Call after mutating `position` or `zoom` directly.
   */
  markDirty(): void {
    this._isDirty = true;
  }

  /**
   * Returns the combined view-projection Matrix3.
   *
   * Rebuilds lazily when position, zoom, or viewport have changed.
   *
   * The matrix chain is:
   *   projection = orthographic(0, width, height, 0)    — Y axis points down (screen space)
   *   view       = scale(zoom, zoom) × translate(-camX, -camY)
   *   viewProj   = projection × view
   */
  getViewProjectionMatrix(): Matrix3 {
    if (this._isDirty) {
      this._rebuild();
      this._isDirty = false;
    }
    return this._vpMatrix;
  }

  /**
   * Converts a world-space position to screen-space pixel coordinates.
   */
  worldToScreen(worldPos: Vector2, out = new Vector2()): Vector2 {
    return this.getViewProjectionMatrix().transformPoint(worldPos, out);
  }

  /**
   * Converts screen-space pixel coordinates to a world-space position.
   */
  screenToWorld(screenPos: Vector2, out = new Vector2()): Vector2 {
    const inv = this.getViewProjectionMatrix().clone();
    inv.invert();
    return inv.transformPoint(screenPos, out);
  }

  private _rebuild(): void {
    // Orthographic projection: maps [0, width] × [0, height] → NDC [-1, 1]
    // Y is flipped (top = 0, bottom = height) to match screen space.
    const proj = Matrix3.orthographic(
      0,
      this._viewportWidth,
      this._viewportHeight,
      0
    );

    // View: translate by -camera position, then scale by zoom.
    // Zoom is applied relative to the viewport center.
    const halfW = this._viewportWidth / 2;
    const halfH = this._viewportHeight / 2;

    // Compose: translate to center, scale (zoom), translate back, then move by -camPos
    // Equivalent to: T(halfW, halfH) × S(zoom) × T(-halfW, -halfH) × T(-camX, -camY)
    const view = Matrix3.identity()
      .translate(halfW, halfH)
      .scale(this.zoom, this.zoom)
      .translate(-halfW, -halfH)
      .translate(-this.position.x, -this.position.y);

    // viewProj = projection × view
    this._vpMatrix = proj.multiply(view);
  }
}
