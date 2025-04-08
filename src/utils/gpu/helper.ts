import { ProgramSource, UrlProgramSource, InlineProgramSource } from "./types";

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
export async function downloadSources(sources: Array<ProgramSource>): Promise<InlineProgramSource[]> {
    const urlSoures = sources.filter(src => (src as UrlProgramSource).vertexUrl && (src as UrlProgramSource).fragmentUrl) as UrlProgramSource[];
    const inlineSources = sources.filter(src => (src as InlineProgramSource).vertex && (src as InlineProgramSource).fragment) as InlineProgramSource[];
    if (inlineSources.length === 0 && urlSoures.length === 0) {
        throw new Error("RenderPipeline requires at least one program source.");
    }
    const shaderPromises = urlSoures.map(async ps => {
        const [vertex, fragment] = await Promise.all([
            fetch(ps.vertexUrl).then(res => res.text()),
            fetch(ps.fragmentUrl).then(res_1 => res_1.text())
        ]);
        return ({ name: ps.name, vertex, fragment } as InlineProgramSource);
    });
    const downloadedSources = await Promise.all(shaderPromises);
    inlineSources.push(...downloadedSources);
    console.log("All URL shaders downloaded.");
    return inlineSources;
}