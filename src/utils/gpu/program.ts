import { Shader } from "./shader";
import { UniformData, UniformType } from "./types";

export class ShaderProgram {
    private readonly gl: WebGL2RenderingContext;
    private readonly program: WebGLProgram;
    private readonly uniformCache = new Map<string, WebGLUniformLocation | null>();
    private readonly attribCache = new Map<string, number>();
    /**
     * Compiles & links a vertex + fragment shader pair.
     * @param gl WebGL2 context
     * @param vertexSource GLSL vertex shader source
     * @param fragmentSource GLSL fragment shader source
     */
    constructor(
        gl: WebGL2RenderingContext,
        vertexSource: string,
        fragmentSource: string
    ) {
        this.gl = gl;
        // Compile shaders
        const vertexShader = new Shader(gl, vertexSource, gl.VERTEX_SHADER);
        const fragmentShader = new Shader(gl, fragmentSource, gl.FRAGMENT_SHADER);
        // Link program
        const program = gl.createProgram();
        if (!program) throw new Error("Unable to create shader program.");
        gl.attachShader(program, vertexShader.handle);
        gl.attachShader(program, fragmentShader.handle);
        gl.linkProgram(program);
        // Clean up individual shaders (no longer needed after linking)
        vertexShader.dispose();
        fragmentShader.dispose();
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const log = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error(`Program link error: ${log ?? "unknown"}`);
        }
        this.program = program;
    }
    /** Activate this program for subsequent draw calls. */
    use(): void {
        this.gl.useProgram(this.program);
    }
    /**
     * Retrieves (and caches) the uniform location.
     * @param name Uniform name in GLSL
     */
    getUniformLocation(name: string): WebGLUniformLocation | null {
        if (!this.uniformCache.has(name)) {
            this.uniformCache.set(name, this.gl.getUniformLocation(this.program, name));
        }
        return this.uniformCache.get(name)!;
    }
    /**
     * Retrieves (and caches) the attribute location.
     * @param name Attribute name in GLSL
     */
    getAttribLocation(name: string): number {
        if (!this.attribCache.has(name)) {
            this.attribCache.set(name, this.gl.getAttribLocation(this.program, name));
        }
        return this.attribCache.get(name)!;
    }
    /**
     * Sets a uniform variable in the shader program.
     * @param name Uniform name in GLSL
     * @param value Value to set
     * @param type Type of the uniform (e.g., FLOAT, VEC2, etc.)
     */
    setUniform(name: string, value: UniformData, type: UniformType, verbose: boolean = false): void {
        const loc = this.getUniformLocation(name);
        if (loc == null) return;
        if (verbose) console.log(`uniform ${UniformType[type]} ${name} = ${value}`);
        switch (type) {
            case UniformType.FLOAT:
                this.gl.uniform1f(loc, value as number);
                break;
            case UniformType.VEC2:
                this.gl.uniform2fv(loc, value as Float32List);
                break;
            case UniformType.VEC3:
                this.gl.uniform3fv(loc, value as Float32List);
                break;
            case UniformType.VEC4:
                this.gl.uniform4fv(loc, value as Float32List);
                break;
            case UniformType.INT:
            case UniformType.SAMPLER2D:
            case UniformType.SAMPLERCUBE:
            case UniformType.SAMPLER2DARRAY:
            case UniformType.SAMPLER3D:
                this.gl.uniform1i(loc, value as number);
                break;
            case UniformType.IVEC2:
                this.gl.uniform2iv(loc, value as Int32List);
                break;
            case UniformType.IVEC3:
                this.gl.uniform3iv(loc, value as Int32List);
                break;
            case UniformType.IVEC4:
                this.gl.uniform4iv(loc, value as Int32List);
                break;
            case UniformType.UINT:
                this.gl.uniform1ui(loc, value as number);
                break;
            case UniformType.UVEC2:
                this.gl.uniform2uiv(loc, value as Uint32List);
                break;
            case UniformType.UVEC3:
                this.gl.uniform3uiv(loc, value as Uint32List);
                break;
            case UniformType.UVEC4:
                this.gl.uniform4uiv(loc, value as Uint32List);
                break;
            case UniformType.BOOL:
                this.gl.uniform1i(loc, (value as boolean) ? 1 : 0);
                break;
            case UniformType.BVEC2:
                this.gl.uniform2iv(loc, new Int32Array((value as boolean[]).map(v => (v ? 1 : 0))));
                break;
            case UniformType.BVEC3:
                this.gl.uniform3iv(loc, new Int32Array((value as boolean[]).map(v => (v ? 1 : 0))));
                break;
            case UniformType.BVEC4:
                this.gl.uniform4iv(loc, new Int32Array((value as boolean[]).map(v => (v ? 1 : 0))));
                break;
            case UniformType.MAT2:
                this.gl.uniformMatrix2fv(loc, false, value as Float32List);
                break;
            case UniformType.MAT3:
                this.gl.uniformMatrix3fv(loc, false, value as Float32List);
                break;
            case UniformType.MAT4:
                this.gl.uniformMatrix4fv(loc, false, value as Float32List);
                break;
            default:
                throw new Error(`Unsupported uniform type for '${name}'.`);
        }
    }
    /**
     * Sets a structured uniform variable in the shader program.
     * @param name Uniform name in GLSL
     * @param value Value to set (can be an object or array)
     */
    setStructuredUniform(name: string, value: any | any[], verbose: boolean = false): void {
        if (Array.isArray(value)) {
            value.forEach((v, i) => this.setStructuredUniform(`${name}[${i}]`, v, verbose));
            return;
        }
        if (typeof value === "object" && value !== null) {
            for (const key of Object.keys(value)) {
                this.setStructuredUniform(`${name}.${key}`, value[key], verbose);
            }
            return;
        }
        this.setUniformWithInference(name, value, verbose);
    }
    /**
     * Sets a uniform variable in the shader program with type inference.
     * @param name Uniform name in GLSL
     * @param value Value to set (can be a number, boolean, array, etc.)
     */
    setUniformWithInference(name: string, value: any, verbose: boolean = false): void {
        const type = this.guessUniformType(value);
        if (type === undefined) {
            throw new Error(`Unable to infer uniform type for '${name}'. Use setUniform explicitly.`);
        }
        this.setUniform(name, value as UniformData, type, verbose);
    }
    /**
     * Infers the uniform type based on the value's structure.
     * @param value Value to infer the type from
     * @returns The inferred uniform type or undefined if it cannot be inferred
     */
    private guessUniformType(value: any): UniformType | undefined {
        if (typeof value === "number") return UniformType.FLOAT;
        if (typeof value === "boolean") return UniformType.BOOL;
        if (value instanceof Float32Array) {
            switch (value.length) {
                case 2: return UniformType.VEC2;
                case 3: return UniformType.VEC3;
                case 4: return UniformType.VEC4;
                case 9: return UniformType.MAT3;
                case 16: return UniformType.MAT4;
            }
        }
        if (value instanceof Int32Array) {
            switch (value.length) {
                case 2: return UniformType.IVEC2;
                case 3: return UniformType.IVEC3;
                case 4: return UniformType.IVEC4;
            }
        }
        if (value instanceof Uint32Array) {
            switch (value.length) {
                case 2: return UniformType.UVEC2;
                case 3: return UniformType.UVEC3;
                case 4: return UniformType.UVEC4;
            }
        }
        if (Array.isArray(value)) {
            switch (value.length) {
                case 2: return UniformType.VEC2;
                case 3: return UniformType.VEC3;
                case 4: return UniformType.VEC4;
                case 9: return UniformType.MAT3;
                case 16: return UniformType.MAT4;
            }
        }
        return undefined;
    }
    /**
     * Sets multiple uniform variables in the shader program using a single call.
     * @param uniforms Object containing uniform names and values
     */
    setUniforms(uniforms: Record<string, UniformData>, verbose: boolean = false): void {
        for (const [name, value] of Object.entries(uniforms)) {
            const type = this.guessUniformType(value);
            if (type === undefined) {
                console.warn(`Unable to infer uniform type for '${name}'. Using setStructuredUniform.`);
                this.setStructuredUniform(name, value, verbose);
            } else {
                this.setUniform(name, value as UniformData, type, verbose);
            }
        }
    }
    /**
     * Sets multiple structured uniform variables in the shader program using a single call.
     * @param uniforms Object containing uniform names and values
     */
    setStructuredUniforms(uniforms: Record<string, any | any[]>, verbose: boolean = false): void {
        for (const [name, value] of Object.entries(uniforms)) {
            this.setStructuredUniform(name, value, verbose);
        }
    }
    /** Delete the program from GPU memory. */
    dispose(): void {
        if (this.program) this.gl.deleteProgram(this.program);
    }
}