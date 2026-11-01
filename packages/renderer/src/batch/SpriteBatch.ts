import { Matrix3 } from '@aether/engine-core';
import { WebGLContext } from '../gl/WebGLContext';
import { ShaderProgram } from '../gl/ShaderProgram';
import { Texture2D, Color4 } from '../texture/Texture2D';
import { SPRITE_VERT_SRC } from '../shaders/sprite.vert';
import { SPRITE_FRAG_SRC } from '../shaders/sprite.frag';

/**
 * Maximum number of quads that can be batched before an automatic flush.
 * Each quad = 4 vertices = 2 triangles = 6 indices.
 */
const MAX_QUADS = 2000;

/**
 * Vertex layout (8 floats per vertex):
 *   [x, y]          — world-space position (2 floats)
 *   [u, v]          — texture UV coordinates (2 floats)
 *   [r, g, b, a]    — tint color (4 floats)
 *
 * Total: 8 floats × 4 bytes = 32 bytes per vertex
 *        32 bytes × 4 vertices = 128 bytes per quad
 */
const FLOATS_PER_VERTEX = 8;
const VERTICES_PER_QUAD = 4;
const INDICES_PER_QUAD = 6;
const FLOAT32_BYTES = 4;

const STRIDE = FLOATS_PER_VERTEX * FLOAT32_BYTES; // 32 bytes

/**
 * 2D sprite batch renderer.
 *
 * Accumulates sprite draw calls into a CPU-side Float32Array buffer and
 * flushes them to the GPU in a single `drawElements` call per texture group.
 *
 * Usage:
 * ```ts
 * batch.begin(camera.getViewProjectionMatrix());
 * batch.drawRect(0, 0, 100, 100, [1, 0, 0, 1]);
 * batch.drawSprite(texture, worldMatrix, [1, 1, 1, 1]);
 * batch.end();
 * ```
 */
export class SpriteBatch {
  private readonly _gl: WebGL2RenderingContext;
  private readonly _shader: ShaderProgram;

  private readonly _vbo: WebGLBuffer;
  private readonly _ibo: WebGLBuffer;
  private readonly _vao: WebGLVertexArrayObject;

  // Pre-allocated CPU buffer: MAX_QUADS × 4 vertices × 8 floats
  private readonly _vertices: Float32Array;

  private _quadCount = 0;
  private _isBegun = false;

  private _currentTexture: Texture2D | null = null;
  private readonly _whiteTexture: Texture2D;

  // Tracks draw call count per frame for debugging
  private _drawCallCount = 0;

  constructor(ctx: WebGLContext) {
    this._gl = ctx.gl;
    const gl = this._gl;

    // Compile shader
    this._shader = new ShaderProgram(ctx, SPRITE_VERT_SRC, SPRITE_FRAG_SRC);

    // Pre-allocate CPU vertex buffer
    this._vertices = new Float32Array(MAX_QUADS * VERTICES_PER_QUAD * FLOATS_PER_VERTEX);

    // Build shared index buffer (indices never change — only vertex data changes)
    const indices = new Uint16Array(MAX_QUADS * INDICES_PER_QUAD);
    for (let i = 0; i < MAX_QUADS; i++) {
      const v = i * VERTICES_PER_QUAD;
      const idx = i * INDICES_PER_QUAD;
      // Two triangles forming a quad: [0,1,2] [2,3,0]
      indices[idx + 0] = v + 0;
      indices[idx + 1] = v + 1;
      indices[idx + 2] = v + 2;
      indices[idx + 3] = v + 2;
      indices[idx + 4] = v + 3;
      indices[idx + 5] = v + 0;
    }

    // Create VAO
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('[SpriteBatch] Failed to create VAO.');
    this._vao = vao;

    // Create VBO (dynamic, updated every frame)
    const vbo = gl.createBuffer();
    if (!vbo) throw new Error('[SpriteBatch] Failed to create VBO.');
    this._vbo = vbo;

    // Create IBO (static)
    const ibo = gl.createBuffer();
    if (!ibo) throw new Error('[SpriteBatch] Failed to create IBO.');
    this._ibo = ibo;

    // Bind VAO and configure vertex attributes
    this._shader.use();
    gl.bindVertexArray(this._vao);

    // Upload static index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    // Allocate dynamic vertex buffer (no data yet)
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this._vertices.byteLength, gl.DYNAMIC_DRAW);

    // Attribute 0: a_position (vec2)
    const posLoc = this._shader.getAttribLocation('a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, STRIDE, 0);

    // Attribute 1: a_texCoord (vec2)
    const uvLoc = this._shader.getAttribLocation('a_texCoord');
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, STRIDE, 2 * FLOAT32_BYTES);

    // Attribute 2: a_color (vec4)
    const colLoc = this._shader.getAttribLocation('a_color');
    gl.enableVertexAttribArray(colLoc);
    gl.vertexAttribPointer(colLoc, 4, gl.FLOAT, false, STRIDE, 4 * FLOAT32_BYTES);

    gl.bindVertexArray(null);

    // Create 1×1 white texture for solid-color quads
    this._whiteTexture = Texture2D.createWhite(ctx);
  }

  /** Number of GPU draw calls issued in the most recent frame. */
  get drawCallCount(): number {
    return this._drawCallCount;
  }

  /** Number of quads accumulated since the last begin(). */
  get quadCount(): number {
    return this._quadCount;
  }

  /**
   * Begins a new frame batch.
   * @param viewProjection Camera view-projection Matrix3.
   */
  begin(viewProjection: Matrix3): void {
    if (this._isBegun) {
      throw new Error('[SpriteBatch] begin() called while batch is already open. Call end() first.');
    }
    this._isBegun = true;
    this._quadCount = 0;
    this._drawCallCount = 0;
    this._currentTexture = null;

    this._shader.use();
    this._shader.setUniformMatrix3fv('u_viewProjection', viewProjection.toFloat32Array());
    this._shader.setUniform1i('u_texture', 0);
  }

  /**
   * Draws a textured sprite quad defined by a world-space 3×3 transform matrix.
   *
   * The matrix is expected to be the output of `Transform2D.getWorldMatrix()`.
   * Corner positions are computed on the CPU from unit quad corners transformed by the matrix.
   *
   * @param texture   The texture to sample. Null uses the white 1×1 texture (solid color).
   * @param matrix    World-space transform Matrix3 (from Transform2D.getWorldMatrix()).
   * @param color     RGBA tint color [r, g, b, a] in 0–1 range.
   * @param uvRect    Texture UV rectangle [u0, v0, u1, v1]. Defaults to full texture [0,0,1,1].
   */
  drawSprite(
    texture: Texture2D | null,
    matrix: Matrix3,
    color: Color4 = [1, 1, 1, 1],
    uvRect: [number, number, number, number] = [0, 0, 1, 1]
  ): void {
    this._assertBegun();
    const tex = texture ?? this._whiteTexture;
    this._switchTexture(tex);
    this._writeQuad(matrix, color, uvRect);
  }

  /**
   * Draws a solid-color axis-aligned rectangle in world space.
   *
   * Internally creates a translation+scale Matrix3 and delegates to drawSprite.
   *
   * @param x      Left edge in world units.
   * @param y      Top edge in world units.
   * @param width  Width in world units.
   * @param height Height in world units.
   * @param color  RGBA color [r, g, b, a] in 0–1 range.
   */
  drawRect(x: number, y: number, width: number, height: number, color: Color4 = [1, 1, 1, 1]): void {
    this._assertBegun();
    this._switchTexture(this._whiteTexture);

    // Build a simple TRS matrix for an axis-aligned rectangle:
    // translate(x + w/2, y + h/2), scale(w, h), no rotation
    const cx = x + width / 2;
    const cy = y + height / 2;
    const mat = Matrix3.identity()
      .translate(cx, cy)
      .scale(width, height);

    this._writeQuad(mat, color, [0, 0, 1, 1]);
  }

  /**
   * Ends the batch, flushing any remaining quads to the GPU.
   */
  end(): void {
    if (!this._isBegun) {
      throw new Error('[SpriteBatch] end() called without a matching begin().');
    }
    if (this._quadCount > 0) {
      this._flush();
    }
    this._isBegun = false;
  }

  /**
   * Releases all GPU resources: VAO, VBO, IBO, shader program, white texture.
   */
  dispose(ctx: WebGLContext): void {
    this._gl.deleteVertexArray(this._vao);
    this._gl.deleteBuffer(this._vbo);
    this._gl.deleteBuffer(this._ibo);
    this._shader.dispose();
    this._whiteTexture.dispose(ctx);
  }

  // --- Private helpers ---

  /**
   * Writes 4 vertices for a quad into the CPU buffer.
   * Unit quad corners [-0.5, -0.5] to [0.5, 0.5] are transformed by the matrix.
   */
  private _writeQuad(
    matrix: Matrix3,
    color: Color4,
    uvRect: [number, number, number, number]
  ): void {
    if (this._quadCount >= MAX_QUADS) {
      this._flush();
    }

    const e = matrix.elements;
    const [r, g, b, a] = color;
    const [u0, v0, u1, v1] = uvRect;

    // Unit quad corners (local space, centered at origin)
    // Top-left, Top-right, Bottom-right, Bottom-left (world Y points down)
    const corners: [number, number, number, number][] = [
      [-0.5, -0.5, u0, v0],
      [ 0.5, -0.5, u1, v0],
      [ 0.5,  0.5, u1, v1],
      [-0.5,  0.5, u0, v1],
    ];

    const base = this._quadCount * VERTICES_PER_QUAD * FLOATS_PER_VERTEX;
    const v = this._vertices;

    for (let i = 0; i < 4; i++) {
      const [lx, ly, u, vCoord] = corners[i]!;

      // Transform local corner → world space via matrix
      // Column-major: [e0, e1, -, e3, e4, -, e6, e7, 1]
      // worldX = e[0]*lx + e[3]*ly + e[6]
      // worldY = e[1]*lx + e[4]*ly + e[7]
      const wx = e[0]! * lx + e[3]! * ly + e[6]!;
      const wy = e[1]! * lx + e[4]! * ly + e[7]!;

      const offset = base + i * FLOATS_PER_VERTEX;
      v[offset + 0] = wx;
      v[offset + 1] = wy;
      v[offset + 2] = u;
      v[offset + 3] = vCoord;
      v[offset + 4] = r;
      v[offset + 5] = g;
      v[offset + 6] = b;
      v[offset + 7] = a;
    }

    this._quadCount++;
  }

  /**
   * If the texture changes mid-batch, flush current quads first.
   */
  private _switchTexture(tex: Texture2D): void {
    if (this._currentTexture !== tex) {
      if (this._quadCount > 0 && this._currentTexture !== null) {
        this._flush();
      }
      this._currentTexture = tex;
    }
  }

  /**
   * Uploads the accumulated vertex data and issues a single drawElements call.
   */
  private _flush(): void {
    if (this._quadCount === 0 || this._currentTexture === null) return;

    const gl = this._gl;

    // Upload only the portion of the buffer that has data
    const byteCount = this._quadCount * VERTICES_PER_QUAD * FLOATS_PER_VERTEX * FLOAT32_BYTES;
    const sub = this._vertices.subarray(0, this._quadCount * VERTICES_PER_QUAD * FLOATS_PER_VERTEX);

    gl.bindVertexArray(this._vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, sub, 0, sub.length);

    // Bind texture to slot 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._currentTexture.handle);

    // Draw all accumulated quads
    gl.drawElements(
      gl.TRIANGLES,
      this._quadCount * INDICES_PER_QUAD,
      gl.UNSIGNED_SHORT,
      0
    );

    gl.bindVertexArray(null);

    this._drawCallCount++;
    this._quadCount = 0;
  }

  private _assertBegun(): void {
    if (!this._isBegun) {
      throw new Error('[SpriteBatch] Draw call outside begin()/end() block.');
    }
  }
}

// Re-export for convenience
export type { Color4 };
