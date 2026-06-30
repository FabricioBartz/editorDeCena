// Vertex Shader (vs)
export const vs = `#version 300 es
in vec4 a_position;
in vec3 a_normal;
in vec2 a_texcoord;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;
uniform mat4 u_textureMatrix;

out vec3 v_normal;
out vec2 v_texcoord;

void main() {
  gl_Position = u_projection * u_view * u_world * a_position;
  v_normal = mat3(u_world) * a_normal;
  v_texcoord = (u_textureMatrix * vec4(a_texcoord, 0, 1)).xy;
}
`;

// Fragment Shader (fs)
export const fs = `#version 300 es
precision highp float;

in vec3 v_normal;
in vec2 v_texcoord;

uniform vec3 u_lightDirection;
uniform sampler2D u_texture;

uniform bool u_drawPicking;
uniform vec4 u_pickingColor;
uniform bool u_drawGrid;

out vec4 outColor;

void main() {
  if (u_drawPicking) {
    outColor = u_pickingColor;
  } else if (u_drawGrid) {
    outColor = vec4(0.4, 0.4, 0.4, 1.0); 
  } else {
    vec3 normal = normalize(v_normal);
    float light = dot(normal, u_lightDirection);
    vec4 texColor = texture(u_texture, v_texcoord);
    outColor = texColor;
    outColor.rgb *= (light * 0.7 + 0.3);
  }
}
`;