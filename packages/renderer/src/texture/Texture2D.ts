import { WebGLContext } from '../gl/WebGLContext';

/** RGBA color as a 4-element tuple [r, g, b, a] with values in 0–1 range. */
export type Color4 = [number, number, number, number];

/**
 * Wraps a WebGLTexture handle along with its metadata.
 *
 * Created via `TextureLoader.load()` or `Texture2D.createWhite()`.
 */
export class Texture2D {
  public readonly handle: WebGLTexture;
  public readonly width: number;
  public readonly height: number;

  constructor(handle: WebGLTexture, width: number, height: number) {
    this.handle = handle;
    this.width = width;
    this.height = height;
  }

  /**
   * Creates a 1×1 white pixel texture.
   * Used as the default texture for solid-color quad rendering
   * so a single shader path handles both colored and textured quads.
   */
  static createWhite(ctx: WebGLContext): Texture2D {
    const gl = ctx.gl;
    const tex = gl.createTexture();
    if (!tex) throw new Error('[Texture2D] Failed to create white texture.');

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,             // mip level
      gl.RGBA,       // internal format
      1, 1,          // 1×1 pixels
      0,             // border (must be 0)
      gl.RGBA,       // source format
      gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255]) // opaque white
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, null);
    return new Texture2D(tex, 1, 1);
  }

  /**
   * Releases the underlying GPU texture resource.
   */
  dispose(ctx: WebGLContext): void {
    ctx.gl.deleteTexture(this.handle);
  }
}
