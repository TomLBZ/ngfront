#version 300 es
precision highp float;

uniform float u_time; // Time in seconds since the program started.

in vec2 v_p; // Texture coordinate from the vertex shader.
out vec4 outColor;

// dummy main that colors square in the center of the screen with a gradient
void main() {
    vec4 transparent = vec4(0.0, 0.0, 0.0, 0.0);
    outColor = v_p.x < 0.2 && v_p.y < 0.2 ? vec4(sin(u_time), max(v_p, 1.0), 1.0) : transparent;
}