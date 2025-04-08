export class Shader {
    private readonly gl: WebGL2RenderingContext;
    private readonly shader: WebGLShader;
    /**
     * Compiles a shader of the given type (VERTEX_SHADER or FRAGMENT_SHADER).
     * @param gl WebGL2 context
     * @param source GLSL source code
     * @param type   gl.VERTEX_SHADER | gl.FRAGMENT_SHADER
     */
    constructor(gl: WebGL2RenderingContext, source: string, type: GLenum) {
        this.gl = gl;
        const shader = gl.createShader(type);
        if (!shader) throw new Error("Unable to create shader.");
        gl.shaderSource(shader, source.trim());
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          const log = gl.getShaderInfoLog(shader);
          gl.deleteShader(shader);
          throw new Error(`Shader compilation error: ${log ?? "unknown"}`);
        }
        this.shader = shader;
    }
    /**
     * @returns The underlying WebGLShader handle.
     */
    get handle(): WebGLShader {
        return this.shader;
    }
    /**
     * Deletes the shader from GPU memory. Safe to call multiple times.
     */
    dispose(): void {
        if (this.shader) this.gl.deleteShader(this.shader);
    }
}