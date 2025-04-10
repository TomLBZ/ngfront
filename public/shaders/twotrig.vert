#version 300 es

layout(location = 0) in vec2 a_position; // Vertex position input, 6 points
uniform vec2 u_scale; // Scale of the screen to be multiplied with the position.
out vec2 v_p; // Vertex position output, 6 points

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0); // Vertex position output (to vec4)
    v_p = a_position * u_scale; // scale the position to the aspect ratio
}