/**
 * Wraps a WebGL2RenderingContext providing safe initialization,
 * canvas resize handling, and clear operations.
 *
 * This class is the lowest-level boundary between the engine and the GPU.
 * All other renderer systems obtain the GL context through this wrapper.
 */
export class WebGLContext {
  public readonly gl: WebGL2RenderingContext;
  public readonly canvas: HTMLCanvasElement;

  private _width: number;
  private _height: number;

  /**
   * Creates a WebGLContext from an HTMLCanvasElement.
   * @throws Error if WebGL2 is not supported by the browser.
   */
  constructor(canvas: HTMLCanvasElement, options: WebGLContextAttributes = {}) {
    this.canvas = canvas;

    const gl = canvas.getContext('webgl2', {
      antialias: false,        // Disable for pixel-perfect 2D rendering
      alpha: false,            // Opaque canvas — avoids compositing overhead
      depth: false,            // 2D renderer does not need a depth buffer
      stencil: false,          // No stencil needed at this stage
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      ...options,
    });

    if (!gl) {
      throw new Error(
        'WebGL2 is not supported in this environment. ' +
        'Please use a modern browser (Chrome 56+, Firefox 51+, Safari 15+).'
      );
    }

    this.gl = gl;
    this._width = canvas.width;
    this._height = canvas.height;

    // Enable alpha blending for sprite transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  /** Current viewport width in pixels. */
  get width(): number {
    return this._width;
  }

  /** Current viewport height in pixels. */
  get height(): number {
    return this._height;
  }

  /**
   * Updates the WebGL viewport and internal dimensions.
   * Call this whenever the canvas is resized.
   */
  resize(width: number, height: number): void {
    this._width = width;
    this._height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  /**
   * Clears the color buffer with the given RGBA values (0–1 range).
   */
  clear(r = 0, g = 0, b = 0, a = 1): void {
    this.gl.clearColor(r, g, b, a);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  /**
   * Listens for WebGL context loss and restoration events.
   * Returns a cleanup function to remove the listeners.
   *
   * @param onLost   Called when the GPU context is lost.
   * @param onRestored Called when the GPU context is restored.
   */
  onContextLost(onLost: () => void, onRestored: () => void): () => void {
    const handleLost = (e: Event): void => {
      e.preventDefault();
      onLost();
    };
    const handleRestored = (): void => {
      onRestored();
    };

    this.canvas.addEventListener('webglcontextlost', handleLost);
    this.canvas.addEventListener('webglcontextrestored', handleRestored);

    return () => {
      this.canvas.removeEventListener('webglcontextlost', handleLost);
      this.canvas.removeEventListener('webglcontextrestored', handleRestored);
    };
  }
}
