import { HttpClient } from "@angular/common/http";
import { HttpOptions, UniPostStruct } from "../../../app/app.interface";
import { DictS, Func } from "../../types";

export class ApiBridge {
    protected readonly funcMap: DictS<Func<any, Promise<any>>> = {};
    protected httpOptions: HttpOptions = {};
    constructor(protected readonly url: string, protected readonly http: HttpClient) {}
    protected get(url: string, data: any = undefined): Promise<any> {
        const paramsStr = data !== undefined ? `?${new URLSearchParams(data).toString()}` : '';
        return new Promise((resolve, reject) => {
            this.http.get(url + paramsStr, this.httpOptions as any).subscribe({
                next: (data) => resolve(data),
                error: (error) => reject(error)
            });
        });
    }
    protected post(url: string, data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.http.post(url, data, this.httpOptions as any).subscribe({
                next: (data) => resolve(data),
                error: (error) => reject(error)
            });
        });
    }
    protected put(url: string, data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.http.put(url, data, this.httpOptions as any).subscribe({
                next: (data) => resolve(data),
                error: (error) => reject(error)
            });
        });
    }
    protected delete(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.http.delete(url, this.httpOptions as any).subscribe({
                next: (data) => resolve(data),
                error: (error) => reject(error)
            });
        });
    }
    protected patch(url: string, data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.http.patch(url, data, this.httpOptions as any).subscribe({
                next: (data) => resolve(data),
                error: (error) => reject(error)
            });
        });
    }
    protected unsupportedFunc(op: string): Promise<any> {
        return new Promise((_, reject) => {
            reject(new Error(`Unsupported Operation: ${op}`));
        });
    }
    public uniPost(data: UniPostStruct, option: HttpOptions = {}): Promise<any> {
        this.httpOptions = option;
        return data.op in this.funcMap ? this.funcMap[data.op](data.data) : this.unsupportedFunc(data.op);
    }
}