import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { env } from './app.config';
import { UniResponseType, FormDataEntry, APIResponse, HttpOptions } from './app.interface';
import { Callback } from '../utils/types';
import { KeyController } from '../utils/src/ctrl/key';
import { StructValidator } from '../utils/src/ds/validate';
import { AeroBridge } from './app.br';
import { KeyControlMode } from '../utils/ctrl';

@Injectable({
  providedIn: 'root'
})
export class AppService {
    private readonly apiUrl = env.apiUrl;
    private readonly production = env.production;
    public readonly keyCtrl = new KeyController(KeyControlMode.EVENT_PRESS);
    private readonly br: AeroBridge;
    constructor(private http: HttpClient) {
        this.br = new AeroBridge(this.apiUrl, this.http);
    }

    private uniPost(op: string, payload: any, responseType: UniResponseType, ...formData: FormDataEntry[]): Observable<any> {
        const options: any = {};
        if (responseType === 'blob') { // blob
            options['responseType'] = responseType;
            options['observe'] = 'response';
        }
        if (formData.length > 0) { // multipart/form-data
            const formDataObj = new FormData();
            const formObj: any = {}; // {key: value}
            const fileObj: any = {}; // {filename: File}
            for (const fd of formData) {
                if (fd.value instanceof File) fileObj[fd.value.name] = fd.value;
                else formObj[fd.name] = fd.value;
            }
            const fileCount = Object.keys(fileObj).length;
            if (fileCount > 1) {
                for (const k in fileObj) {
                    formDataObj.append('files', fileObj[k], k); // append multiple files as 'files'
                }
            } else if (fileCount > 0) {
                const k = Object.keys(fileObj)[0];
                formDataObj.append('file', fileObj[k], k); // append single file as 'file'
            }
            formDataObj.append('op', op);
            formDataObj.append('data', JSON.stringify(payload));
            return this.http.post(`${this.apiUrl}/uniPostMultipart`, formDataObj, options);
        } else { // application/json
            return this.http.post(`${this.apiUrl}/uniPostJson`, {op: op, data: payload}, options);
        }
    }
    
    public callAPI<T = any, E = void | any>(op: string, next: Callback<T>, data: any = {}, error: Callback<E> = console.log, resType: UniResponseType = 'json', ...formData: FormDataEntry[]): void {
        if (this.production) this.callAPIDirect(op, next, data, error, resType, ...formData);
        else this.callAPIBridged(op, next, data, error, resType, ...formData);
    }

    public callAPIBridged<T = any, E = void | any>(op: string, next: Callback<T>, data: any = {}, error: Callback<E> = console.log, resType: UniResponseType = 'json', ...formData: FormDataEntry[]): void {
        this.uniPost(op, data, resType, ...formData).subscribe({ next, error });
    }

    private generatePayload(data: any, ...formData: FormDataEntry[]): FormData {
        const formDataObj = new FormData();
        const fileObj: any = {}; // {filename: File}
        for (const fd of formData) {
            if (fd.value instanceof File) fileObj[fd.value.name] = fd.value;
        }
        const fileCount = Object.keys(fileObj).length;
        if (fileCount > 1) {
            for (const k in fileObj) {
                formDataObj.append('files', fileObj[k], k); // append multiple files as 'files'
            }
        } else if (fileCount > 0) {
            const k = Object.keys(fileObj)[0];
            formDataObj.append('file', fileObj[k], k); // append single file as 'file'
        }
        for (const key in data) {
            if (data[key] instanceof File) formDataObj.append(key, data[key], key);
            else formDataObj.append(key, JSON.stringify(data[key]));
        }
        return formDataObj;
    }

    public callAPIDirect<T = any, E = void | any>(op: string, next: Callback<T>, data: any = {}, error: Callback<E> = console.log, resType: UniResponseType = 'json', ...formData: FormDataEntry[]): void {
        const opt: HttpOptions = resType === 'blob' ? {
            responseType: resType,
            observe: 'response'
        } : {} as HttpOptions;
        const payload: any = formData.length === 0 ? data 
            : this.generatePayload(data, ...formData);
        this.br.uniPost({op: op, data: payload}, opt).then(next, error);
    }

    public isValidAPIResponse(d: any): d is APIResponse {
        return StructValidator.hasFields(d, ["success", "msg", "data"]);
    }

    public hasDataProperties(d: APIResponse, props: string[]): boolean {
        if (!d.data) return false;
        for (const prop of props) {
            if (!d.data.hasOwnProperty(prop)) return false;
        }
        return true;
    }

    public navigateTo(path: string): void {
        // path looks like '/path' or '../path'
        window.location.href = path;
    }
}