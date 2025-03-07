import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { AppService } from '../../app/app.service';
import { Uniform, UniformMat, UniformSingle, UniformTexture, UniformTextureArray, UniformVec, UniformVec2, UniformVec4 } from '../../utils/uniform/u';

export type VertLoader = () => Array<number>;
export type UniformDict = { [key: string]: Uniform };

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
    private textureCache = new Map<string, ImageBitmap>();
    private glTextureCache = new Map<string, WebGLTexture>();
    private glTextureArrayCache = new Map<string, WebGLTexture>();
    private start_t: number = -1;
    constructor(private svc: AppService) {}
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
        this.uniforms['u_resolution'] = new UniformVec2([this.canvasRef.nativeElement.clientWidth, this.canvasRef.nativeElement.clientHeight]);
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
    private updateVectorValueUniform(gl: WebGLRenderingContext | WebGL2RenderingContext, value: UniformVec | UniformMat, location: WebGLUniformLocation): void {
        const a = value.arr;
        switch (a.length) {
            case 2:
                gl.uniform2f(location, a[0], a[1]); // UniformVec2
                break;
            case 3:
                gl.uniform3f(location, a[0], a[1], a[2]); // UniformVec3
                break;
            case 4:
                if (value instanceof UniformVec4) {
                    gl.uniform4f(location, a[0], a[1], a[2], a[3]); // UniformVec4
                } else {
                    gl.uniformMatrix2fv(location, false, new Float32Array(a)); // UniformMat2
                }
                break;
            case 9:
                gl.uniformMatrix3fv(location, false, new Float32Array(a)); // UniformMat3
                break
            case 16:
                gl.uniformMatrix4fv(location, false, new Float32Array(a)); // UniformMat4
                break;
        }
    }
    private loadBitmap(t: UniformTexture): void {
        if (this.textureCache.has(t.url)) { return; } // already loaded
        const pixel: Array<number> = [0, 0, 255, 255]; // single blue opaque pixel
        const data: ImageData = new ImageData(new Uint8ClampedArray(pixel), 1, 1);
        createImageBitmap(data).then((bmp: ImageBitmap) => {
            this.textureCache.set(t.url, bmp); // set in cache to prevent further loading
        }).then(() => this.svc.downloadImage(t.url)).then((bmp: ImageBitmap) => { // early returned, will run async
            this.textureCache.set(t.url, bmp); // overwrite cache with real texture after loading
        });
    }
    private loadTexture(gl: WebGLRenderingContext | WebGL2RenderingContext, t: UniformTexture, bmp: ImageBitmap): WebGLTexture {
        if (this.glTextureCache.has(t.url)) {
            return this.glTextureCache.get(t.url)!;
        }
        const texture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bmp);
        gl.generateMipmap(gl.TEXTURE_2D);
        this.glTextureCache.set(t.url, texture);
        return texture;
    }
    private loadTextureArray(gl: WebGLRenderingContext | WebGL2RenderingContext, value: UniformTextureArray): WebGLTexture | undefined {
        const key = value.textures.map((t) => t.url).join("::");
        let texture = this.glTextureArrayCache.get(key);
        if (texture) return texture;
        const bitmaps: ImageBitmap[] = [];
        let w = 1, h = 1;
        for (const t of value.textures) {
            const bmp = this.textureCache.get(t.url);
            if (!bmp) return undefined;
            w = Math.max(w, bmp.width);
            h = Math.max(h, bmp.height);
            bitmaps.push(bmp);
        }
        if (gl instanceof WebGL2RenderingContext) {
            texture = gl.createTexture()!;
            gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
            gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, w, h, bitmaps.length);
            for (let i = 0; i < bitmaps.length; i++) {
                gl.texSubImage3D(
                    gl.TEXTURE_2D_ARRAY,
                    0,             // level
                    0, 0, i,       // x, y, layer
                    w, h, 1,       // width, height, depth=1
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    bitmaps[i]
                );
            }
            gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
            this.glTextureArrayCache.set(key, texture);
            return texture;
        }
      
        // -----------------------------
        // WebGL1 fallback: create multiple 2D textures, one per bitmap.
        // (only if you actually need this fallback)
        // -----------------------------
        /*
        // If you want to handle WebGL1 fallback via multiple 2D textures/samplers,
        // create an array of textures here, store them in a separate Map, etc.
        // Then return undefined or a dummy to signal your rendering code.
        const fallbackTextures: WebGLTexture[] = [];
        for (let i = 0; i < bitmaps.length; i++) {
          const tex = gl.createTexture()!;
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmaps[i]);
          gl.generateMipmap(gl.TEXTURE_2D);
          fallbackTextures.push(tex);
        }
        this.glTextureArrayFallback.set(key, fallbackTextures);
        return undefined; // or some sentinel
        */
      
        // If you're only targeting WebGL2, you can omit the fallback entirely.
        return undefined;
    }
    private updateSingleValueUniform(gl: WebGLRenderingContext | WebGL2RenderingContext, value: UniformSingle, location: WebGLUniformLocation): void {
        if (typeof value === 'number') {
            gl.uniform1f(location, value);
        } else if (value instanceof UniformTexture) {
            this.loadBitmap(value); // load texture
            const bmp = this.textureCache.get(value.url)!; // texture must exist
            const texture = this.loadTexture(gl, value, bmp);
            gl.activeTexture(gl.TEXTURE0 + value.unit);
            gl.bindTexture(gl.TEXTURE_2D, texture); // bind texture first before loading
            gl.uniform1i(location, value.unit);
        } else if (value instanceof UniformTextureArray) {
            for (const t of value.textures) {
                this.loadBitmap(t);
            }
            const texObj = this.loadTextureArray(gl, value);
            if (!texObj) return; // texture not loaded yet
            if (gl instanceof WebGL2RenderingContext) {
                gl.activeTexture(gl.TEXTURE0 + value.unit);
                gl.bindTexture(gl.TEXTURE_2D_ARRAY, texObj);
                gl.uniform1i(location, value.unit);
            } else {
                // If you implemented the WebGL1 fallback with multiple 2D textures,
                // you'd bind them all here and set uniform1iv (sampler array).
                // ...
            }
            // const bitmaps: Array<ImageBitmap> = [];
            // let w = 1;
            // let h = 1;
            // for (const t of value.textures) {
            //     this.loadBitmap(t); // load texture
            //     const bmp = this.textureCache.get(t.url); // texture must exist
            //     if (bmp === undefined) return; // texture not loaded yet
            //     w = Math.max(w, bmp.width);
            //     h = Math.max(h, bmp.height);
            //     bitmaps.push(bmp); // texture must exist
            // }
            // if (gl instanceof WebGL2RenderingContext) {
            //     const texture = gl.createTexture()!; // create texture
            //     gl.activeTexture(gl.TEXTURE0 + value.unit);
            //     gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
            //     gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, w, h, bitmaps.length);
            //     for (let i = 0; i < bitmaps.length; i++) {
            //         gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, w, h, 1, gl.RGBA, gl.UNSIGNED_BYTE, bitmaps[i]);
            //     }
            //     gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
            //     gl.uniform1i(location, value.unit);
            // } else {
            //     for (let i = 0; i < bitmaps.length; i++) {
            //         const texture = gl.createTexture()!; // create texture for each bitmap
            //         gl.activeTexture(gl.TEXTURE0 + value.unit + i);
            //         gl.bindTexture(gl.TEXTURE_2D, texture);
            //         gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmaps[i]);
            //         gl.generateMipmap(gl.TEXTURE_2D);
            //     }
            //     gl.uniform1iv(location, Array.from({ length: bitmaps.length }, (_, i) => value.unit + i));
            // }
        }
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
            const arr = Object.getOwnPropertyDescriptor(value, 'arr');
            if (arr) {
                this.updateVectorValueUniform(gl, value as UniformVec | UniformMat, location);
            } else {
                this.updateSingleValueUniform(gl, value as UniformSingle, location);
            }
        }
    }
}  