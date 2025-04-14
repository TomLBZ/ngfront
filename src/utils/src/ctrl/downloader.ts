export class Downloader {
    static async downloadBlob(url: string): Promise<Blob> {
        const res = await fetch(url);
        return await res.blob();
    }

    static async downloadText(url: string): Promise<string> {
        const res = await fetch(url);
        return await res.text();
    }

    static async downloadJSON(url: string): Promise<any> {
        const res = await fetch(url);
        return await res.json();
    }

    static async downloadArrayBuffer(url: string): Promise<ArrayBuffer> {
        const res = await fetch(url);
        return await res.arrayBuffer();
    }

    static async downloadImage(url: string): Promise<ImageBitmap> {
        const blob = await Downloader.downloadBlob(url);
        return await createImageBitmap(blob);
    }
}