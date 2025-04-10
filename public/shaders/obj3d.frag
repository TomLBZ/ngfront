#version 300 es
precision highp float;

in vec2 v_p; // Texture coordinate from the vertex shader.
out vec4 outColor;

uniform vec2 u_scale; // Scale of the texture coordinates.
uniform sampler2D u_prev; // Previous pass texture.

vec4 prev() {
    return texture(u_prev, v_p / u_scale * 0.5 + 0.5);
}

// dummy main that colors square in the center of the screen with a gradient
void main() {
    outColor = prev();
}