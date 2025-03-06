import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';

export type VertLoader = () => Array<number>;
export type UniformDict = { [key: string]: number | Array<number> | Texture };
export class Texture {
    constructor(public texture: WebGLTexture, public textureUnit: number = 0) {}
}

@Component({
    selector: 'webglshaderhost',
    standalone: true,
    templateUrl: './webglshaderhost.html',
})
export class WebGLShaderHostComponent implements AfterViewInit, OnDestroy {
    @ViewChild('canvasRef', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
    @Input() vertexShaderPath: string = '/shaders/hud.vert';
    @Input() fragmentShaderPath: string = '/shaders/hud.frag';
    @Input() uniforms: UniformDict = {};
    @Output() onDraw = new EventEmitter<WebGLRenderingContext | WebGL2RenderingContext>();
    private gl!: WebGLRenderingContext | WebGL2RenderingContext;
    private program!: WebGLProgram | null;
    private isProgramReady = false;
    private uniformLocations: Map<string, WebGLUniformLocation> = new Map();
    ngAfterViewInit(): void {
        const glContext = this.canvasRef.nativeElement.getContext('webgl2') ||
            this.canvasRef.nativeElement.getContext('webgl');
        if (!glContext) {
            console.error('WebGL not supported in this browser.');
            return;
        }
        this.gl = glContext;
        // Load shaders and initialize the program
        this.initWebGLProgram()
        .then(() => {
            this.isProgramReady = true;
            console.log('WebGL program initialized.');
        })
        .catch((err) => {
            console.error('Failed to initialize WebGL program:', err);
        });
    }
    ngOnDestroy(): void {
        if (this.program && this.gl) {
            this.gl.deleteProgram(this.program);
            this.program = null;
        }
    }
    private textureCache = new Map<string, WebGLTexture>();
    public async loadTexture(url: string): Promise<WebGLTexture> {
        if (this.textureCache.has(url)) {
            return this.textureCache.get(url)!;
        }
        const image = new Image();
        image.src = url;
        await image.decode();
        const gl = this.gl;
        const texture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        this.textureCache.set(url, texture);
        return texture;
    }
    
    private start_t: number = -1;
    public drawFrame(vloader?: VertLoader): void {
        if (!this.isProgramReady || !this.gl || !this.program) return;
        // update canvas size
        this.canvasRef.nativeElement.width = this.canvasRef.nativeElement.clientWidth;
        this.canvasRef.nativeElement.height = this.canvasRef.nativeElement.clientHeight;
        // assign auto uniforms
        if (this.start_t < 0) {
            this.start_t = performance.now() / 1000;
        }
        this.uniforms['u_time'] = performance.now() / 1000 - this.start_t; // time in seconds
        this.uniforms['u_resolution'] = [this.canvasRef.nativeElement.clientWidth, this.canvasRef.nativeElement.clientHeight];
        const gl = this.gl;
        // Set up the viewport
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // Use our compiled shader program
        gl.useProgram(this.program);
        // Upload uniforms
        this.updateUniforms(gl);
        const verticesArr = vloader !== undefined ? vloader() : this.dummyVertLoader();
        const vertices = new Float32Array(verticesArr);
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        const positionLocation = gl.getAttribLocation(this.program!, 'a_position');
        if (positionLocation !== -1) {
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        }
        const nVerts = Math.floor(vertices.length / 2); // 2 floats per vertex
        gl.drawArrays(gl.TRIANGLES, 0, nVerts);
        this.onDraw.emit(this.gl);
    }
  
    private async initWebGLProgram(): Promise<void> {
        const [vertSource, fragSource] = await Promise.all([
            this.loadShaderSource(this.vertexShaderPath),
            this.loadShaderSource(this.fragmentShaderPath),
        ]);
        const vertexShader = this.compileShader(vertSource, this.gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(fragSource, this.gl.FRAGMENT_SHADER);
        if (!vertexShader || !fragmentShader) {
            throw new Error('Shader compilation failed.');
        }
        const program = this.gl.createProgram();
        if (!program) {
            throw new Error('Could not create WebGL program.');
        }
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            const infoLog = this.gl.getProgramInfoLog(program);
            this.gl.deleteProgram(program);
            throw new Error('Program link error: ' + infoLog);
        }
        this.gl.deleteShader(vertexShader);
        this.gl.deleteShader(fragmentShader);
        this.program = program;
    }
    private async loadShaderSource(path: string): Promise<string> {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load shader from ${path}`);
        }
        return await response.text();
    }
    private compileShader(source: string, type: number): WebGLShader | null {
        const shader = this.gl.createShader(type);
        if (!shader) return null;
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const infoLog = this.gl.getShaderInfoLog(shader);
            this.gl.deleteShader(shader);
            console.error(`Error compiling shader:`, infoLog);
            return null;
        }
        return shader;
    }
    private dummyVertLoader(): Array<number> {
        return [
            -1, -1, 
            1, -1, 
           -1,  1, 
           -1,  1, 
            1, -1, 
            1,  1
        ]
    }
    private updateUniforms(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
        for (const key of Object.keys(this.uniforms)) {
            const value = this.uniforms[key];
            // Cache uniform location lookups
            let location = this.uniformLocations.get(key);
            if (!location) {
                const loc = gl.getUniformLocation(this.program!, key);
                if (loc) {
                    location = loc;
                    this.uniformLocations.set(key, location);
                } else { // If uniform doesn't exist in the shader, skip
                    continue;
                }
            }
            // For simplicity, handle a few types by example:
            if (typeof value === 'number') {
                gl.uniform1f(location, value);
            } else if (Array.isArray(value)) {
                // Decide by array length, e.g. uniform2f, uniform3f, uniform4f, uniformMatrix4fv, etc.
                // Example for 1D float arrays:
                switch (value.length) {
                    case 1:
                        gl.uniform1f(location, value[0]);
                        break;
                    case 2:
                        gl.uniform2f(location, value[0], value[1]);
                        break;
                    case 3:
                        gl.uniform3f(location, value[0], value[1], value[2]);
                        break;
                    case 4:
                        gl.uniform4f(location, value[0], value[1], value[2], value[3]);
                        break;
                    case 16:
                        // Possibly a 4x4 matrix
                        gl.uniformMatrix4fv(location, false, new Float32Array(value));
                        break;
                    // Expand as needed for your use case
                }
            } else if (value instanceof Texture) {
                if (value.texture) {
                    gl.activeTexture(gl.TEXTURE0 + value.textureUnit);
                    gl.bindTexture(gl.TEXTURE_2D, value.texture);
                }
                gl.uniform1i(location, value.textureUnit);
            }
        }
    }
}  