import { ShaderProgram } from "./program";
import { AttributeConfig, PassSource, ProgramSource, RenderFunc, RenderTarget, TextureTarget, UniformData, UniformRecord, UniformType } from "./types";
import { downloadSources } from "./helper";
import { Texture } from "./texture";

export class RenderPipeline {
    private readonly gl: WebGL2RenderingContext;
    private readonly vao: WebGLVertexArrayObject;
    private readonly passes: PassSource[] = [];
    private readonly programs = new Map<string, ShaderProgram>();
    private readonly targets = new Map<string, RenderTarget>();
    private readonly attributeConfigs = new Map<string, AttributeConfig>();
    private get canvas(): HTMLCanvasElement { return this.gl.canvas as HTMLCanvasElement; }
    private get width(): number { return this.canvas.clientWidth; }
    private get height(): number { return this.canvas.clientHeight; }

    private currentProgram!: ShaderProgram;
    private indexBuffer: WebGLBuffer | null = null;
    private indexType: GLenum = 0;
    private indexCount = 0;
    
    /**
     * @param gl WebGL2 context
     * @param sources Array of program sources (name, vertex shader, fragment shader)
     */
    constructor(gl: WebGL2RenderingContext, verbose: boolean = false) {
        this.gl = gl;
        const vao = gl.createVertexArray();
        if (!vao) throw new Error("Unable to create VAO.");
        this.vao = vao;
        if (verbose) console.log("RenderPipeline created. Please initialize with loadPrograms and setPasses.");
    }

    async loadPrograms(progs: Array<ProgramSource>, verbose: boolean = false): Promise<RenderPipeline> {
        const srcs: Array<ProgramSource> = await downloadSources(progs, verbose);
        srcs.forEach(src => {
            if (this.programs.has(src.name)) throw new Error(`Duplicate program name '${src.name}'.`);
            this.programs.set(src.name, new ShaderProgram(this.gl, src.vertex, src.fragment));
            if (verbose) console.log(`Program '${src.name}' loaded.`);
        });
        if (this.programs.size === 0) throw new Error("RenderPipeline requires at least one program.");
        // default to first program
        this.currentProgram = this.programs.values().next().value!;
        if (verbose) console.log("RenderPipeline initialized with programs:", Array.from(this.programs.keys()));
        return this;
    }

    setPasses(passes: Array<PassSource>, verbose: boolean = false): void {
        const lastPass = passes.pop(); // last pass must render to canvas, so pop it to prevent it from being added to targets
        if (!lastPass) throw new Error("RenderPipeline requires at least one pass.");
        passes.forEach(src => {
            const w = src.width ?? this.width;
            const h = src.height ?? this.height;
            const tex = Texture.create(this.gl, TextureTarget.TEX_2D, { width: w, height: h, mipmaps: false });
            const fbo = this.gl.createFramebuffer();
            if (!fbo) throw new Error("Unable to create framebuffer.");
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, tex.handle, 0);
            const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
            if (status !== this.gl.FRAMEBUFFER_COMPLETE) throw new Error(`Framebuffer incomplete: ${status} for pass '${src.name}'.`);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            const target: RenderTarget = { framebuffer: fbo, texture: tex };
            this.targets.set(src.name, target);
            this.passes.push(src);
        });
        this.passes.push(lastPass); // add the last pass back
        if (verbose) console.log("RenderPipeline passes set:", this.passes.map(p => p.name));
    }

    /**
     * Activates a shader program by name.
     * @param name Name of the shader program to activate
     * @returns The activated ShaderProgram
     * @throws Error if the program is not found
     */
    useProgram(name: string, verbose: boolean = false): ShaderProgram {
        if (verbose) console.log(`Using program '${name}'`);
        const prog = this.programs.get(name);
        if (!prog) throw new Error(`Program '${name}' not found.`);
        this.currentProgram = prog;
        prog.use();
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
    setAttribute(name: string, config: AttributeConfig): void {
        this.attributeConfigs.set(name, config);
        this.programs.forEach(p => this.applyAttributeToProgram(p, name, config));
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
     * Applies the attribute configuration to the specified shader program.
     * @param program The shader program to apply the attribute to
     * @param name Name of the attribute
     * @param cfg Configuration object for the attribute
     */
    private applyAttributeToProgram(program: ShaderProgram, name: string, cfg: AttributeConfig): void {
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
     * Binds a render target for rendering.
     * @param passName Name of the pass to bind
     */
    private bindTarget(passName: string) {
        const target = this.targets.get(passName);
        if (target) {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, target.framebuffer);
            this.gl.viewport(0, 0, target.texture.width, target.texture.height);
        } else {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            this.gl.viewport(0, 0, this.width, this.height);
        }
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    /** 
     * Draws the current program using the bound index buffer.
     * @param count Number of indices to draw
     * @param offset Offset in the index buffer
     */
    private draw(mode: GLenum = this.gl.TRIANGLES, count?: number, offset = 0): void {
        this.gl.bindVertexArray(this.vao);
        if (this.indexBuffer) {
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            this.gl.drawElements(mode, count ?? this.indexCount, this.indexType, offset);
        } else this.gl.drawArrays(mode, offset, count ?? 0);
        this.gl.bindVertexArray(null);
    }

    /**
     * Renders all passes in the pipeline.
     * @param customRenderFunc Optional custom render function for custom behaviors for each program by name.
     */
    renderAll(uniformMap?: Map<string, UniformRecord>, customRenderFunc?: RenderFunc): void {
        this.gl.canvas.width = this.width; // update canvas size
        this.gl.canvas.height = this.height; // update canvas size
        let prevTex: Texture | null = null;
        for(const pass of this.passes){
            this.bindTarget(pass.name); // bind framebuffer if present and set viewport
            const prog = this.useProgram(pass.name); // activate the program and get the program
            // if there is a previous texture, bind & set uniform (if present)
            if(prevTex) { 
                prevTex.bind(0); 
                prog.setUniform("u_prev", 0, UniformType.SAMPLER2D); 
                if (uniformMap) {
                    const uniforms = uniformMap.get(pass.name);
                    if (uniforms) prog.setUniforms(uniforms);
                }
            }
            // user hook
            if(customRenderFunc) customRenderFunc(pass.name, prog);
            // draw full‑screen triangles by default
            this.draw();
            // store texture for next pass
            prevTex = this.targets.get(pass.name)?.texture ?? prevTex;
        }
    }

    /**
     * Sets uniform for all programs.
     * @param uniforms The uniforms to set
     * @param verbose Whether to log the uniforms being set
     */
    setGlobalUniforms(uniforms: UniformRecord, verbose: boolean = false): void {
        this.programs.forEach(p => {
            p.use();
            p.setUniforms(uniforms, verbose);
        });
    }
  
    /** Deletes all shader programs and buffers. */
    dispose(): void {
        this.programs.forEach(p => p.dispose());
        this.targets.forEach(t => {t.texture.dispose(); this.gl.deleteFramebuffer(t.framebuffer);});
        if (this.vao) this.gl.deleteVertexArray(this.vao);
        if (this.indexBuffer) this.gl.deleteBuffer(this.indexBuffer);
    }
}