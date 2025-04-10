import { TextureTarget, TextureOptions } from "./types";

/** Mapping for cube‑map face order (+X,‑X,+Y,‑Y,+Z,‑Z). */
const CUBE_FACES: GLenum[] = [
    WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X,
    WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_X,
    WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Y,
    WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Y,
    WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Z,
    WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z,
];

export class Texture {
    private readonly gl: WebGL2RenderingContext;
    private readonly target: GLenum;
    private readonly tex: WebGLTexture;
    readonly width: number;
    readonly height: number;
    readonly depth: number; // layers for array / depth for 3‑D
    public get handle(): WebGLTexture { return this.tex; }
    /* -------------------------------------------------- static cache ---- */
    private static imageCache = new Map<string, Promise<HTMLImageElement>>();
    /* ------------------------------------------------ constructor ---- */
    private constructor(gl: WebGL2RenderingContext, target: GLenum, tex: WebGLTexture, w: number, h: number, d = 1) {
      this.gl = gl; this.target = target; this.tex = tex; this.width = w; this.height = h; this.depth = d;
    }
    /* --------------------------- generic empty texture factory --------- */
    static create(gl: WebGL2RenderingContext, target: TextureTarget, opts: TextureOptions = {}): Texture {
        const tex = gl.createTexture(); if (!tex) throw new Error("Unable to create texture");
        gl.bindTexture(target, tex);
        const width  = opts.width  ?? 1;
        const height = opts.height ?? 1;
        const depth  = target === TextureTarget.TEX_3D      ? (opts.depth  ?? 1) :
                       target === TextureTarget.TEX_2D_ARRAY ? (opts.layers ?? 1) : 1;
        const internal = opts.internalFormat ?? gl.RGBA8;
        if (target === TextureTarget.TEX_3D || target === TextureTarget.TEX_2D_ARRAY) {
            gl.texStorage3D(target, 1, internal, width, height, depth);
        } else if (target === TextureTarget.TEX_CUBE) {
            gl.texStorage2D(target, 1, internal, width, height);
        } else {
            gl.texStorage2D(target, 1, internal, width, height);
        }
        Texture.applyParameters(gl, target, opts);
        if (opts.mipmaps) gl.generateMipmap(target);
        gl.bindTexture(target, null);
        return new Texture(gl, target, tex, width, height, depth);
    }
    /* --------------------------- 2‑D & 2‑D array loaders --------------- */
    static async load2DFromUrl(gl: WebGL2RenderingContext, url: string, opts: TextureOptions = {}): Promise<Texture> {
        const img = await Texture.loadImage(url, opts.crossOrigin);
        const tex = Texture.create(gl, TextureTarget.TEX_2D, { ...opts, width: img.width, height: img.height });
        tex.updateFromImage(img);
        if (opts.mipmaps) tex.generateMips();
        return tex;
    }
    static async loadArrayFromUrls(gl: WebGL2RenderingContext, urls: string[], opts: TextureOptions = {}): Promise<Texture> {
        if (urls.length === 0) throw new Error("Texture array needs at least one URL");
        const imgs = await Promise.all(urls.map(u => Texture.loadImage(u, opts.crossOrigin)));
        const w = imgs[0].width, h = imgs[0].height;
        if (!imgs.every(i => i.width === w && i.height === h)) throw new Error("All images must have identical dimensions for texture array");
        const tex = Texture.create(gl, TextureTarget.TEX_2D_ARRAY, { ...opts, width: w, height: h, layers: imgs.length });
        imgs.forEach((img, layer) => tex.updateFromImage(img, 0, layer));
        if (opts.mipmaps) tex.generateMips();
        return tex;
    }
    /* --------------------------- cube‑map loader ----------------------- */
    static async loadCubeFromUrls(gl: WebGL2RenderingContext, urls: string[], opts: TextureOptions = {}): Promise<Texture> {
        if (urls.length !== 6) throw new Error("Cube map requires 6 URLs (posx,negx,posy,negy,posz,negz)");
        const imgs = await Promise.all(urls.map(u => Texture.loadImage(u, opts.crossOrigin)));
        const w = imgs[0].width, h = imgs[0].height;
        if (!imgs.every(i => i.width === w && i.height === h)) throw new Error("Cube‑map faces must have identical dimensions");
        const tex = Texture.create(gl, TextureTarget.TEX_CUBE, { ...opts, width: w, height: h });
        gl.bindTexture(TextureTarget.TEX_CUBE, tex.tex);
        imgs.forEach((img, i) => gl.texSubImage2D(CUBE_FACES[i], 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, img));
        gl.bindTexture(TextureTarget.TEX_CUBE, null);
        if (opts.mipmaps) tex.generateMips();
        return tex;
    }
    /* --------------------------- compressed upload helpers ------------- */
    /**
     * Uploads a compressed 2‑D / 2‑D array / 3‑D image (single mip‑level).
     * User must provide width/height/depth and correct internalFormat.
     */
    static createCompressed(gl: WebGL2RenderingContext, target: TextureTarget, data: ArrayBufferView, dims: {width:number;height:number;depth?:number;layers?:number}, internalFormat: GLenum, opts: TextureOptions = {}): Texture {
        const tex = Texture.create(gl, target, { ...opts, width: dims.width, height: dims.height, depth: dims.depth, layers: dims.layers, internalFormat });
        gl.bindTexture(target, tex.tex);
        if (target === TextureTarget.TEX_3D || target === TextureTarget.TEX_2D_ARRAY) {
            gl.compressedTexSubImage3D(target, 0, 0, 0, 0, dims.width, dims.height, dims.depth ?? dims.layers ?? 1, internalFormat, data);
        } else {
            gl.compressedTexSubImage2D(target, 0, 0, 0, dims.width, dims.height, internalFormat, data);
        }
        gl.bindTexture(target, null);
        if (opts.mipmaps) tex.generateMips();
        return tex;
    }
    /* --------------------------- instance methods ---------------------- */
    updateFromImage(source: TexImageSource, level = 0, layer = 0): void {
        const gl = this.gl;
        gl.bindTexture(this.target, this.tex);
        const width = source instanceof VideoFrame ? source.displayWidth : source.width;
        const height = source instanceof VideoFrame ? source.displayHeight : source.height;
        if (this.target === TextureTarget.TEX_2D_ARRAY || this.target === TextureTarget.TEX_3D) {
            gl.texSubImage3D(this.target, level, 0, 0, layer, width, height, 1, gl.RGBA, gl.UNSIGNED_BYTE, source);
        } else if (this.target === TextureTarget.TEX_CUBE) {
            throw new Error("Use loadCubeFromUrls or texSubImage2D on faces for cube maps");
        } else {
            gl.texSubImage2D(this.target, level, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
        }
        gl.bindTexture(this.target, null);
    }
  
    /** Upload raw pixel data (typed array) to a 3‑D or 2‑D array texture. */
    updateFromData(data: ArrayBufferView, width: number, height: number, depthOrLayer = 1, level = 0): void {
        const gl = this.gl;
        gl.bindTexture(this.target, this.tex);
        if (this.target === TextureTarget.TEX_3D || this.target === TextureTarget.TEX_2D_ARRAY) {
            gl.texSubImage3D(this.target, level, 0, 0, 0, width, height, depthOrLayer, gl.RGBA, gl.UNSIGNED_BYTE, data);
        } else {
            gl.texSubImage2D(this.target, level, 0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);
        }
        gl.bindTexture(this.target, null);
    }
  
    /** Generates mipmaps for this texture (caller must ensure sizes are power‑of‑two if needed). */
    generateMips(): void { this.gl.bindTexture(this.target, this.tex); this.gl.generateMipmap(this.target); this.gl.bindTexture(this.target, null); }
  
    bind(unit: number): number { this.gl.activeTexture(this.gl.TEXTURE0 + unit); this.gl.bindTexture(this.target, this.tex); return unit; }
    dispose(): void { this.gl.deleteTexture(this.tex); }
  
    /* --------------------------- internal helpers ---------------------- */
    private static applyParameters(gl: WebGL2RenderingContext, target: GLenum, opts: TextureOptions): void {
        const defaults: Record<GLenum, GLint | GLfloat> = {
            [gl.TEXTURE_MIN_FILTER]: opts.mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR,
            [gl.TEXTURE_MAG_FILTER]: gl.LINEAR,
            [gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
            [gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE,
            [gl.TEXTURE_WRAP_R]: gl.CLAMP_TO_EDGE,
        };
        const params = { ...defaults, ...(opts.parameters ?? {}) };
        Object.entries(params).forEach(([p, v]) => gl.texParameteri(target, Number(p), v as any));
    }
  
    private static loadImage(url: string, cross: string | null | undefined = "anonymous"): Promise<HTMLImageElement> {
        if (Texture.imageCache.has(url)) return Texture.imageCache.get(url)!;
        const promise = new Promise<HTMLImageElement>((res, rej) => {
            const img = new Image();
            img.crossOrigin = cross === null ? "" : cross;
            img.onload = () => res(img);
            img.onerror = rej;
            img.src = url;
        });
        Texture.imageCache.set(url, promise);
        return promise;
    }
}