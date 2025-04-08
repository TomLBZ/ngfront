#version 300 es
precision highp float;

uniform float u_time; // Time in seconds since the program started.

in vec2 v_p; // Fragment coordinate from the vertex shader.
out vec4 outColor;

// dummy main that outputs a color based on the coordinates and the time using a sine function
void main() {
    vec2 uv = v_p; // Assuming a resolution of 800x600 for demonstration
    float r = length(uv - vec2(0.5, 0.5)) * 2.0;
    float g = sin(u_time + uv.x * 10.0) * 0.5 + 0.5;
    float b = cos(u_time + uv.y * 10.0) * 0.5 + 0.5;
    outColor = vec4(r, g, b, 1.0);
}