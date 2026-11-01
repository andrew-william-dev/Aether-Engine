import { WebGLContext } from './WebGLContext';

/**
 * Represents a compiled and linked WebGL2 shader program.
 *
 * Handles:
 * - Vertex and fragment shader compilation with detailed error reporting.
 * - Program linking.
 * - Attribute location caching.
 * - Uniform location caching and typed setters.
 */
export class ShaderProgram {
  public readonly program: WebGLProgram;

  private readonly _gl: WebGL2RenderingContext;
  private readonly _attribCache = new Map<string, number>();
  private readonly _uniformCache = new Map<string, WebGLUniformLocation>();

  /**
   * Compiles vertex and fragment shaders and links them into a program.
   * @throws Error with the GLSL compile or link log on failure.
   */
  constructor(ctx: WebGLContext, vertSrc: string, fragSrc: string) {
    this._gl = ctx.gl;

    const vert = this._compileShader(this._gl.VERTEX_SHADER, vertSrc);
    const frag = this._compileShader(this._gl.FRAGMENT_SHADER, fragSrc);
    this.program = this._linkProgram(vert, frag);

    // Shaders are no longer needed after linking
    this._gl.deleteShader(vert);
    this._gl.deleteShader(frag);
  }

  /**
   * Activates this shader program for subsequent draw calls.
   */
  use(): void {
    this._gl.useProgram(this.program);
  }

  /**
   * Returns the attribute location by name (cached after first lookup).
   */
  getAttribLocation(name: string): number {
    let loc = this._attribCache.get(name);
    if (loc === undefined) {
      loc = this._gl.getAttribLocation(this.program, name);
      if (loc === -1) {
        console.warn(`[ShaderProgram] Attribute "${name}" not found in shader.`);
      }
      this._attribCache.set(name, loc);
    }
    return loc;
  }

  /**
   * Returns the uniform location by name (cached after first lookup).
   */
  getUniformLocation(name: string): WebGLUniformLocation | null {
    let loc = this._uniformCache.get(name);
    if (loc === undefined) {
      const found = this._gl.getUniformLocation(this.program, name);
      if (found === null) {
        console.warn(`[ShaderProgram] Uniform "${name}" not found in shader.`);
        return null;
      }
      this._uniformCache.set(name, found);
      return found;
    }
    return loc;
  }

  /**
   * Sets a mat3 uniform by name.
   * @param name   Uniform variable name.
   * @param matrix Column-major Float32Array of 9 elements.
   */
  setUniformMatrix3fv(name: string, matrix: Float32Array): void {
    const loc = this.getUniformLocation(name);
    if (loc !== null) {
      // transpose = false because our Matrix3 is already column-major
      this._gl.uniformMatrix3fv(loc, false, matrix);
    }
  }

  /**
   * Sets an integer uniform (used for texture sampler slots).
   */
  setUniform1i(name: string, value: number): void {
    const loc = this.getUniformLocation(name);
    if (loc !== null) {
      this._gl.uniform1i(loc, value);
    }
  }

  /**
   * Releases the underlying WebGL program resource.
   */
  dispose(): void {
    this._gl.deleteProgram(this.program);
    this._attribCache.clear();
    this._uniformCache.clear();
  }

  // --- Private helpers ---

  private _compileShader(type: number, src: string): WebGLShader {
    const shader = this._gl.createShader(type);
    if (!shader) {
      throw new Error('[ShaderProgram] Failed to create shader object.');
    }

    this._gl.shaderSource(shader, src);
    this._gl.compileShader(shader);

    if (!this._gl.getShaderParameter(shader, this._gl.COMPILE_STATUS)) {
      const log = this._gl.getShaderInfoLog(shader) ?? 'Unknown compile error';
      this._gl.deleteShader(shader);
      const typeName = type === this._gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT';
      throw new Error(`[ShaderProgram] ${typeName} shader compile error:\n${log}`);
    }

    return shader;
  }

  private _linkProgram(vert: WebGLShader, frag: WebGLShader): WebGLProgram {
    const program = this._gl.createProgram();
    if (!program) {
      throw new Error('[ShaderProgram] Failed to create program object.');
    }

    this._gl.attachShader(program, vert);
    this._gl.attachShader(program, frag);
    this._gl.linkProgram(program);

    if (!this._gl.getProgramParameter(program, this._gl.LINK_STATUS)) {
      const log = this._gl.getProgramInfoLog(program) ?? 'Unknown link error';
      this._gl.deleteProgram(program);
      throw new Error(`[ShaderProgram] Program link error:\n${log}`);
    }

    return program;
  }
}
