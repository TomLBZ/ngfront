#version 300 es
precision highp float;

uniform float u_time; // Time in seconds since the program started.
uniform sampler2D u_prev; // Previous pass texture.

in vec2 v_p; // Texture coordinate from the vertex shader.
out vec4 outColor;

vec4 prev(vec2 p) {
    return texture(u_prev, p * 0.5 + 0.5);
}

// dummy main that colors square in the center of the screen with a gradient
void main() {
    outColor = abs(v_p.x) < 0.2 && abs(v_p.y) < 0.2 ? 
        vec4(sin(u_time), max(v_p, 1.0), 1.0) : 
        prev(v_p);
}