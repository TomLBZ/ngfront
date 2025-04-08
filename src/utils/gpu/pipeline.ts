import { ShaderProgram } from "./program";
import { PipelineAttributeConfig, ProgramSource, UniformData, UniformType } from "./types";
import { downloadSources } from "./helper";

export class RenderPipeline {
    private readonly gl: WebGL2RenderingContext;
    private readonly vao: WebGLVertexArrayObject;
    private readonly programs = new Map<string, ShaderProgram>();
    private currentProgram!: ShaderProgram;
  
    private readonly attributeConfigs = new Map<string, PipelineAttributeConfig>();
    private indexBuffer: WebGLBuffer | null = null;
    private indexType: GLenum = 0;
    private indexCount = 0;
    
    /**
     * @param gl WebGL2 context
     * @param sources Array of program sources (name, vertex shader, fragment shader)
     */
    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
        const vao = gl.createVertexArray();
        if (!vao) throw new Error("Unable to create VAO.");
        this.vao = vao;
        console.log("RenderPipeline created. Please initialize with init().");
    }

    async init(sources: Array<ProgramSource>): Promise<RenderPipeline> {
        const srcs = await downloadSources(sources);
        srcs.forEach(src => {
            if (this.programs.has(src.name)) throw new Error(`Duplicate program name '${src.name}'.`);
            this.programs.set(src.name, new ShaderProgram(this.gl, src.vertex, src.fragment));
        });
        if (this.programs.size === 0) throw new Error("RenderPipeline requires at least one program.");
        // default to first program
        this.currentProgram = this.programs.values().next().value!;
        this.currentProgram.use();
        console.log("RenderPipeline initialized with programs:", Array.from(this.programs.keys()));
        return this;
    }

    /**
     * Activates a shader program by name.
     * @param name Name of the shader program to activate
     * @returns The activated ShaderProgram
     * @throws Error if the program is not found
     */
    useProgram(name: string, uniforms: Record<string, UniformData | any | any[]>): ShaderProgram {
        console.log(`Using program '${name}'`);
        const prog = this.programs.get(name);
        if (!prog) throw new Error(`Program '${name}' not found.`);
        this.currentProgram = prog;
        prog.use();
        prog.setUniforms(uniforms);
        return prog;
    }
  
    /** Returns the active ShaderProgram. */
    getProgram(): ShaderProgram {
        return this.currentProgram;
    }
  
    /**
     * Adds or overrides a new shader program to the pipeline at runtime.
     * @param name Name of the new program
     * @param vertex Vertex shader source code
     * @param fragment Fragment shader source code
     * @returns The newly created ShaderProgram
     */
    addProgram(name: string, vertex: string, fragment: string): ShaderProgram {
        if (this.programs.has(name)) console.warn(`Program '${name}' overridden.`);
        const prog = new ShaderProgram(this.gl, vertex, fragment);
        this.programs.set(name, prog);
        // replicate all existing attribute bindings onto the new program
        this.attributeConfigs.forEach((cfg, attr) => this.applyAttributeToProgram(prog, attr, cfg));
        return prog;
    }
  
    /** 
     * Stores attribute configuration for all programs.
     * @param name Name of the attribute
     * @param config Configuration object for the attribute
     */
    setAttribute(name: string, config: PipelineAttributeConfig): void {
        this.attributeConfigs.set(name, config);
        this.programs.forEach(p => this.applyAttributeToProgram(p, name, config));
    }
  
    /** 
     * Applies the attribute configuration to the specified shader program.
     * @param program The shader program to apply the attribute to
     * @param name Name of the attribute
     * @param cfg Configuration object for the attribute
     */
    private applyAttributeToProgram(program: ShaderProgram, name: string, cfg: PipelineAttributeConfig): void {
        const { buffer, size, type = this.gl.FLOAT, normalized = false, stride = 0, offset = 0 } = cfg;
        const location = program.getAttribLocation(name);
        if (location === -1) {
            console.warn(`Attribute '${name}' not found in a program.`);
            return;
        }
        this.gl.bindVertexArray(this.vao);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.enableVertexAttribArray(location);
        this.gl.vertexAttribPointer(location, size, type, normalized, stride, offset);
        this.gl.bindVertexArray(null);
    }
  
    /** 
     * Sets the index / element buffer for indexed drawing shared by all programs.
     * @param buffer The index buffer
     * @param type Type of the index buffer (e.g., gl.UNSIGNED_SHORT)
     * @param count Number of indices in the buffer
     */
    setIndexBuffer(buffer: WebGLBuffer, type: GLenum, count: number): void {
        this.indexBuffer = buffer;
        this.indexType = type;
        this.indexCount = count;
    }
  
    /** 
     * Draws the current program using the bound index buffer.
     * @param count Number of indices to draw
     * @param offset Offset in the index buffer
     */
    drawTriangles(count?: number, offset = 0): void { this.draw(this.gl.TRIANGLES, count, offset); }
  
    /** 
     * Draws the current program using the bound index buffer.
     * @param count Number of indices to draw
     * @param offset Offset in the index buffer
     */
    draw(mode: GLenum, count?: number, offset = 0): void {
        this.gl.bindVertexArray(this.vao);
        if (this.indexBuffer) {
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            this.gl.drawElements(mode, count ?? this.indexCount, this.indexType, offset);
        } else {
            this.gl.drawArrays(mode, offset, count ?? 0);
        }
        this.gl.bindVertexArray(null);
    }
  
    /** Deletes all shader programs and buffers. */
    dispose(): void {
        this.programs.forEach(p => p.dispose());
        if (this.vao) this.gl.deleteVertexArray(this.vao);
        if (this.indexBuffer) this.gl.deleteBuffer(this.indexBuffer);
    }
}