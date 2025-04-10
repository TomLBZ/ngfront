#version 300 es
precision highp float;

uniform float u_time; // Time in seconds since the program started.

in vec2 v_p; // Fragment coordinate from the vertex shader. from (-1, -1) to (1, 1)
out vec4 outColor;

float linew = 0.01;
vec4 black = vec4(0.0);
vec4 white = vec4(1.0);

// dummy main that outputs a color based on the coordinates and the time using a sine function
void main() {
    vec4 bg = vec4(sin(u_time), v_p, 1.0);
    vec2 m = mod(v_p, 0.5);
    vec4 scale = abs(m.x) < linew || abs(m.y) < linew ? black : white;
    vec4 circle = abs(length(v_p) - 1.0) < linew ? black : white;
    vec4 slanted = abs(v_p.x - v_p.y) < linew ? black : white;
    outColor = bg * scale * circle * slanted;
}