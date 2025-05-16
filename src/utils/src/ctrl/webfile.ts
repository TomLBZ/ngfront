import { Downloader } from "./downloader";

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
    public static ObjToFile(obj: any, name: string) {
        const blob = new Blob([JSON.stringify(obj)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = name;
        link.click();
    }
}