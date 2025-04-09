#version 300 es
precision highp float;

uniform float u_time; // Time in seconds since the program started.

in vec2 v_p; // Fragment coordinate from the vertex shader. from (-1, -1) to (1, 1)
out vec4 outColor;

// dummy main that outputs a color based on the coordinates and the time using a sine function
void main() {
    if (v_p.x < 0.1 && v_p.x > -0.1) outColor = vec4(1.0, 0.0, 0.0, 1.0); // red for y axis
    else if (v_p.y < 0.1 && v_p.y > -0.1) outColor = vec4(0.0, 1.0, 0.0, 1.0); // green for x axis
    else outColor = vec4(sin(u_time), v_p, 1.0);
}