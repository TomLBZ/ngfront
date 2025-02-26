#version 300 es
precision highp float;

// Example uniform(s). For instance, pitch, roll, or anything else
// you'd like to pass in from the Angular component.
uniform float u_pitch;
uniform float u_roll;

// Varyings from the vertex shader.
in vec2 v_texcoord;

// WebGL 2.0 fragment shader must explicitly declare output variable.
out vec4 outColor;

void main() {
    // A simple color output that changes with pitch/roll in some way.
    // This is purely for demonstration. Feel free to adapt.
    
    float r = 0.5 + 0.5 * sin(u_roll);
    float g = 0.5 + 0.5 * cos(u_pitch);
    float b = 0.5 + 0.5 * sin(u_pitch + u_roll);

    // We can optionally include v_texcoord in the coloring
    // just to show how you'd use it:
    r *= 1.0 - v_texcoord.x;
    g *= v_texcoord.y;

    outColor = vec4(r, g, b, 1.0);
}