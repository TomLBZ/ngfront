import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { AppService } from '../../app/app.service';
import { UniformDict, UniformTexture, UniformTextureArray, UniformVec4Array, 
    UniformValueLike, UniformArrayLike, UniformVecLike, 
    UniformVec2, UniformVec4, 
    isUniformValueLike, isUniformVecLike, isUniformArrayLike,
    } from '../../utils/uniform/u';
import { Downloader } from '../../utils/api/downloader';

export type VertLoader = () => Array<number>;

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
    private bmpCache = new Map<string, ImageBitmap>();
    private glTextureCache = new Map<string, WebGLTexture>();
    private glTextureArrayCache = new Map<string, WebGLTexture>();
    private glTextureArrayFallback = new Map<string, WebGLTexture[]>();
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
    private loadBitmap(t: UniformTexture): void {
        if (this.bmpCache.has(t.url)) { return; } // already loaded
        Downloader.downloadImage(t.url).then((bmp: ImageBitmap) => { // early returned, will run async
            this.bmpCache.set(t.url, bmp); // overwrite cache with real texture after loading
        }, (err) => {
            console.log(err); // do not fail if texture cannot be loaded
        });
        // const pixel: Array<number> = [0, 0, 255, 255]; // single blue opaque pixel
        // const data: ImageData = new ImageData(new Uint8ClampedArray(pixel), 1, 1);
        // createImageBitmap(data).then((bmp: ImageBitmap) => {
        //     this.bmpCache.set(t.url, bmp); // set in cache to prevent further loading
        // }).then(() => this.svc.downloadImage(t.url)).then((bmp: ImageBitmap) => { // early returned, will run async
        //     this.bmpCache.set(t.url, bmp); // overwrite cache with real texture after loading
        // });
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
        if (texture !== undefined) return texture;
        const bitmaps: ImageBitmap[] = [];
        let w = 1, h = 1;
        for (const t of value.textures) {
            const bmp = this.bmpCache.get(t.url);
            if (bmp === undefined) return undefined;
            w = Math.max(w, bmp.width);
            h = Math.max(h, bmp.height);
            bitmaps.push(bmp);
        }
        if (gl instanceof WebGL2RenderingContext) {
            texture = gl.createTexture()!;
            const depth = Math.max(1, bitmaps.length);
            gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
            gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, w, h, depth);
            if (bitmaps.length === 0) {
                gl.texSubImage3D(
                    gl.TEXTURE_2D_ARRAY,
                    0,             // level
                    0, 0, 0,       // x, y, layer
                    w, h, 1,       // width, height, depth=1
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    new Uint8Array([0, 0, 0, 0])
                );
            } else {
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
            }
            gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
            this.glTextureArrayCache.set(key, texture);
            return texture;
        } else { // WebGL1 fallback: create multiple 2D textures, one per bitmap.
            const fallbackTextures: WebGLTexture[] = [];
            if (bitmaps.length === 0) {
                const tex = gl.createTexture()!;
                gl.bindTexture(gl.TEXTURE_2D, tex);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
                gl.generateMipmap(gl.TEXTURE_2D);
                fallbackTextures.push(tex);
            } else {
                for (let i = 0; i < bitmaps.length; i++) {
                    const tex = gl.createTexture()!;
                    gl.bindTexture(gl.TEXTURE_2D, tex);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmaps[i]);
                    gl.generateMipmap(gl.TEXTURE_2D);
                    fallbackTextures.push(tex);
                }
            }
            this.glTextureArrayFallback.set(key, fallbackTextures);
            return undefined; // or some sentinel
        }
    }
    private updateValueUniform(gl: WebGLRenderingContext | WebGL2RenderingContext, value: UniformValueLike, location: WebGLUniformLocation): void {
        if (typeof value === 'number') {
            gl.uniform1f(location, value);
        } else if (value instanceof UniformTexture) {
            this.loadBitmap(value); // load texture
            const bmp = this.bmpCache.get(value.url); // texture must exist
            if (!bmp) return; // texture not loaded yet
            const texture = this.loadTexture(gl, value, bmp);
            gl.activeTexture(gl.TEXTURE0 + value.unit);
            gl.bindTexture(gl.TEXTURE_2D, texture); // bind texture first before loading
            gl.uniform1i(location, value.unit);
        } else if (value instanceof UniformTextureArray) {
            for (const t of value.textures) {
                this.loadBitmap(t);
            }
            const texObj = this.loadTextureArray(gl, value);
            if (gl instanceof WebGL2RenderingContext) {
                if (!texObj) return; // texture not loaded yet
                gl.activeTexture(gl.TEXTURE0 + value.unit);
                gl.bindTexture(gl.TEXTURE_2D_ARRAY, texObj);
                gl.uniform1i(location, value.unit);
            } else { // WebGL1 fallback
                const fallbackTextures = this.glTextureArrayFallback.get(value.textures.map((t) => t.url).join("::"));
                if (!fallbackTextures) return; // texture not loaded yet
                for (let i = 0; i < fallbackTextures.length; i++) {
                    gl.activeTexture(gl.TEXTURE0 + value.unit + i);
                    gl.bindTexture(gl.TEXTURE_2D, fallbackTextures[i]);
                }
                gl.uniform1iv(location, Array.from({ length: fallbackTextures.length }, (_, i) => value.unit + i));
            }
        }
    }
    private updateVectorUniform(gl: WebGLRenderingContext | WebGL2RenderingContext, value: UniformVecLike, location: WebGLUniformLocation): void {
        const a = value.v;
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
    private updateArrayUniforms(gl: WebGLRenderingContext | WebGL2RenderingContext, value: UniformArrayLike, location: WebGLUniformLocation): void {
        const arr = value.arr;
        const vlen = value.vlen;
        const flat = arr.map((v) => v.v).flat();
        switch (vlen) {
            case 2:
                if (flat.length > 0) gl.uniform2fv(location, flat);
                else gl.uniform2f(location, 0, 0);
                break;
            case 3:
                if (flat.length > 0) gl.uniform3fv(location, flat);
                else gl.uniform3f(location, 0, 0, 0);
                break;
            case 4:
                if (value instanceof UniformVec4Array) {
                    if (flat.length > 0) gl.uniform4fv(location, flat);
                    else gl.uniform4f(location, 0, 0, 0, 0);
                }
                else {
                    if (flat.length > 0) gl.uniformMatrix2fv(location, false, flat);
                    else gl.uniformMatrix2fv(location, false, new Float32Array([1, 0, 0, 1]));
                }
                break;
            case 9:
                if (flat.length > 0) gl.uniformMatrix3fv(location, false, flat);
                else gl.uniformMatrix3fv(location, false, new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]));
                break;
            case 16:
                if (flat.length > 0) gl.uniformMatrix4fv(location, false, flat);
                else gl.uniformMatrix4fv(location, false, new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));
                break;
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
            if (isUniformValueLike(value)) {
                this.updateValueUniform(gl, value as UniformValueLike, location);
            } else if (isUniformVecLike(value)) {
                this.updateVectorUniform(gl, value as UniformVecLike, location);
            } else if (isUniformArrayLike(value)) {
                this.updateArrayUniforms(gl, value as UniformArrayLike, location);
            }
        }
    }
}  