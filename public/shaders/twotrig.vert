#version 300 es

layout(location = 0) in vec2 a_position; // Vertex position input, 6 points
uniform vec2 u_resolution; // Resolution of the screen in pixels.
out vec2 v_p;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0); // Vertex position output (to vec4)
    float minResolution = min(u_resolution.x, u_resolution.y); // shortest side of the viewport
    vec2 aspect = vec2(u_resolution.x / minResolution, u_resolution.y / minResolution); // aspect ratio
    v_p = a_position * aspect; // scale the position to the aspect ratio
}