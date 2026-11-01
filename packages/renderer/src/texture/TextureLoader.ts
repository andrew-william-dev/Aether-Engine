import { WebGLContext } from '../gl/WebGLContext';
import { Texture2D } from './Texture2D';

/**
 * Loads images from URLs into GPU-ready `Texture2D` instances.
 */
export class TextureLoader {
  /**
   * Asynchronously loads an image URL into a WebGL2 texture.
   *
   * @param ctx WebGLContext to upload the texture into.
   * @param url Image URL (relative or absolute).
   * @param options Optional texture filtering and wrapping settings.
   * @returns Promise resolving to a `Texture2D`.
   * @throws Error if the image fails to load or texture creation fails.
   */
  static load(
    ctx: WebGLContext,
    url: string,
    options: {
      minFilter?: number;
      magFilter?: number;
      wrapS?: number;
      wrapT?: number;
      generateMipmaps?: boolean;
    } = {}
  ): Promise<Texture2D> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';

      image.onload = () => {
        const gl = ctx.gl;
        const tex = gl.createTexture();
        if (!tex) {
          reject(new Error('[TextureLoader] Failed to create WebGLTexture.'));
          return;
        }

        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          image
        );

        const minFilter = options.minFilter ?? (options.generateMipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
        const magFilter = options.magFilter ?? gl.LINEAR;
        const wrapS = options.wrapS ?? gl.CLAMP_TO_EDGE;
        const wrapT = options.wrapT ?? gl.CLAMP_TO_EDGE;

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);

        if (options.generateMipmaps) {
          gl.generateMipmap(gl.TEXTURE_2D);
        }

        gl.bindTexture(gl.TEXTURE_2D, null);
        resolve(new Texture2D(tex, image.naturalWidth, image.naturalHeight));
      };

      image.onerror = () => {
        reject(new Error(`[TextureLoader] Failed to load image: "${url}"`));
      };

      image.src = url;
    });
  }
}
