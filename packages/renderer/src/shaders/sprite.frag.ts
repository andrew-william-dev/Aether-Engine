/**
 * Sprite fragment shader.
 *
 * Samples the bound texture at the interpolated UV coordinate and multiplies
 * by the per-vertex tint color. Supports both textured sprites and solid-color
 * quads (when the texture is a 1×1 white pixel).
 */
export const SPRITE_FRAG_SRC = /* glsl */ `#version 300 es
precision mediump float;

in vec2 v_texCoord;
in vec4 v_color;

uniform sampler2D u_texture;

out vec4 fragColor;

void main() {
  vec4 texColor = texture(u_texture, v_texCoord);
  fragColor = texColor * v_color;
}
`;
