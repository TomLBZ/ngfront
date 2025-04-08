export enum UniformType {
    FLOAT,
    VEC2,
    VEC3,
    VEC4,
    INT,
    IVEC2,
    IVEC3,
    IVEC4,
    UINT,
    UVEC2,
    UVEC3,
    UVEC4,
    BOOL,
    BVEC2,
    BVEC3,
    BVEC4,
    MAT2,
    MAT3,
    MAT4,
    SAMPLER2D,
    SAMPLERCUBE,
    SAMPLER2DARRAY, // NEW: texture array sampler
}
export type UniformData = number | boolean | number[] | boolean[] | Int32Array | Uint32Array | Float32Array;

export enum TextureTarget {
    TEX_2D        = WebGL2RenderingContext.TEXTURE_2D,
    TEX_2D_ARRAY  = WebGL2RenderingContext.TEXTURE_2D_ARRAY,
    TEX_3D        = WebGL2RenderingContext.TEXTURE_3D,
    TEX_CUBE      = WebGL2RenderingContext.TEXTURE_CUBE_MAP,
}
/** Options for creating a texture. */
export interface TextureOptions {
    width?: number;
    height?: number;
    depth?: number;    // for 3‑D
    layers?: number;   // for 2‑D array
    internalFormat?: GLenum; // default RGBA8
    format?: GLenum;         // default RGBA
    type?: GLenum;           // default UNSIGNED_BYTE
    mipmaps?: boolean;
    parameters?: Record<GLenum, GLint | GLfloat>;
    crossOrigin?: string | null;
}

export interface PipelineAttributeConfig {
    /** The WebGLBuffer containing the vertex data. */
    buffer: WebGLBuffer;
    /** The number of components per vertex attribute (e.g., 2 for vec2, 3 for vec3). */
    size: GLint;
    /** The data type of the attribute (e.g., gl.FLOAT). */
    type?: GLenum;
    /** Whether the data should be normalized (default: false). */
    normalized?: GLboolean;
    /** The offset in bytes between consecutive vertex attributes (default: 0). */
    stride?: GLsizei;
    /** The offset in bytes of the first component in the buffer (default: 0). */
    offset?: GLintptr;
}
  
export interface InlineProgramSource { name: string; vertex: string; fragment: string; }
export interface UrlProgramSource { name: string; vertexUrl: string; fragmentUrl: string; }

export type ProgramSource = InlineProgramSource | UrlProgramSource;

