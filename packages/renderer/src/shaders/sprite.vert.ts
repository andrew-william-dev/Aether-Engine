/**
 * Sprite vertex shader.
 *
 * Inputs per vertex:
 *   a_position (vec2) — world-space X, Y (already transformed by CPU-side matrix multiply)
 *   a_texCoord (vec2) — UV texture coordinates
 *   a_color    (vec4) — per-vertex tint color (RGBA, 0–1)
 *
 * Uniform:
 *   u_viewProjection (mat3) — camera view-projection matrix (orthographic)
 *
 * The vertex position is transformed from world space → NDC by multiplying:
 *   gl_Position = vec4((u_viewProjection * vec3(worldPos, 1.0)).xy, 0.0, 1.0)
 */
export const SPRITE_VERT_SRC = /* glsl */ `#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_texCoord;
in vec4 a_color;

uniform mat3 u_viewProjection;

out vec2 v_texCoord;
out vec4 v_color;

void main() {
  vec3 worldPos = u_viewProjection * vec3(a_position, 1.0);
  gl_Position = vec4(worldPos.xy, 0.0, 1.0);
  v_texCoord = a_texCoord;
  v_color = a_color;
}
`;
