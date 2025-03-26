import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { env } from './app.config';
import { APICallback, APIAnyCallback, UniResponseType, FormDataEntry } from './app.interface';
import { StructValidator } from '../utils/api/validate';

@Injectable({
  providedIn: 'root'
})
export class AppService {
    private apiUrl = env.apiUrl;
    constructor(private http: HttpClient) {}

    uniPost(op: string, payload: any, responseType: UniResponseType, ...formData: FormDataEntry[]): Observable<any> {
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

    rootGet(): Observable<any> {
        return this.http.get(`${this.apiUrl}`);
    }
    
    callJsonAPI(op: string, next: APICallback, data: any = {}, error: APIAnyCallback = console.error): void {
        this.uniPost(op, data, 'json').subscribe({
            next: (d: any) => StructValidator.hasFields(d, ['success', 'msg', 'data']) ? next(d) : error(d),
            error
        });
    }
}