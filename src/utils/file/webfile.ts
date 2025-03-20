import { Downloader } from "../api/downloader";

export class WebFile {
    constructor(public url: string, public name: string) {}
    public download() {
        const link = document.createElement("a");
        link.href = this.url;
        link.download = this.name;
        link.click();
    }
    public downloadAsync() {
        return Downloader.downloadBlob(this.url);
    }
    public static AggregateDownloads(files: Array<WebFile>) {
        Promise.all(files.map((f) => f.downloadAsync())).then((blobs) => {
            const link = document.createElement("a");
            link.href = URL.createObjectURL(new Blob(blobs));
            link.download = "download.zip";
            link.click();
        });
    }
}