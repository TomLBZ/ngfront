#version 300 es

layout(location = 0) in vec2 a_position;

// Example uniform that might represent some model/view/projection matrix
// or transformation for a HUD. You can omit if not needed.
uniform mat4 u_transform;

// Pass any varying data (e.g. texture coordinates) to the fragment shader
out vec2 v_texcoord;

void main() {
    // Simple pass-through coordinates in clip space
    // If you have a transform, multiply the position by that:
    gl_Position = u_transform * vec4(a_position, 0.0, 1.0);

    // Example: If using a_position directly as texture coordinates
    // (you can adapt this as needed)
    // Because a_position is in [-1,1], we can remap to [0,1] for texturing:
    v_texcoord = (a_position + 1.0) * 0.5;
}