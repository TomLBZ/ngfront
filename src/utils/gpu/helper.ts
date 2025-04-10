import { ProgramSource } from "./types";

/**
 * Creates a WebGL buffer and uploads data to it.
 * @param gl WebGL2RenderingContext
 * @param data Buffer data to upload
 * @param target Buffer target (default: gl.ARRAY_BUFFER)
 * @param usage Buffer usage hint (default: gl.STATIC_DRAW)
 * @returns The created WebGLBuffer
 */
export function createBuffer(
    gl: WebGL2RenderingContext,
    data: BufferSource,
    target: GLenum = gl.ARRAY_BUFFER,
    usage: GLenum = gl.STATIC_DRAW
): WebGLBuffer {
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("Unable to create buffer.");
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, usage);
    gl.bindBuffer(target, null);
    return buffer;
}

/**
 * Downloads shader sources from URLs if not already inlined.
 * @param sources Array of program sources
 * @returns Array of InlineProgramSource
 */
export async function downloadSources(sources: Array<ProgramSource>, verbose: boolean = false): Promise<ProgramSource[]> {
    const urlSources: ProgramSource[] = [];
    const inlineSources: ProgramSource[] = [];
    sources.forEach(src => {
        if (src.url) urlSources.push(src);
        else inlineSources.push(src);
    });
    if (inlineSources.length === 0 && urlSources.length === 0) {
        throw new Error("RenderPipeline requires at least one program source.");
    }
    const shaderPromises = urlSources.map(async s => {
        const [vertex, fragment] = await Promise.all([
            fetch(s.vertex).then(res => res.text()),
            fetch(s.fragment).then(res_1 => res_1.text())
        ]);
        return ({ name: s.name, vertex, fragment, url: false } as ProgramSource);
    });
    const downloadedSources = await Promise.all(shaderPromises);
    inlineSources.push(...downloadedSources);
    if (verbose) console.log("All URL shaders downloaded.");
    return inlineSources;
}