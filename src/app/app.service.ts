import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { env } from './app.config';
import { APICallback, APIAnyCallback, APIResponse } from './app.interface';
import { Cache } from '../utils/cache/cache';
import { Flag } from '../utils/flag/flag';

@Injectable({
  providedIn: 'root'
})
export class AppService {
    private apiUrl = env.apiUrl;
    apiDataCache: Cache<APIResponse> = new Cache<APIResponse>();
    apiFlags: Flag = new Flag([]);
    constructor(private http: HttpClient) {}

    uniPost(op: string, payload: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/uniPost`, { op: op, data: payload });
    }

    rootGet(): Observable<any> {
        return this.http.get(`${this.apiUrl}`);
    }

    call(op: string, next: APIAnyCallback, data: any = {}, error: APIAnyCallback = console.error): void {
        this.uniPost(op, data).subscribe({
            next,
            error
        });
    }

    private validAPIResponse(d: any): boolean {
        return d.hasOwnProperty("success") && d.hasOwnProperty("msg") && d.hasOwnProperty("data");
    }
    
    callAPI(op: string, next: APICallback, data: any = {}, error: APIAnyCallback = console.error): void {
        this.uniPost(op, data).subscribe({
            next: (d: any) => this.validAPIResponse(d) ? next(d) : error(d),
            error
        });
    }

    callAPIWithCache(op: string, data: any = undefined, error: APIAnyCallback = console.error): void {
        const dataStr = data !== undefined ? JSON.stringify(data) : "";
        const fname = op + dataStr; // name to be used for flags
        if (this.apiFlags.indexOf(fname) < 0) { // not in flags
            this.apiFlags.addName(fname);
        }
        if (this.apiFlags.get(fname)) return; // already called
        this.callAPI(op, (d: APIResponse) => {
            this.apiDataCache.set(this.apiFlags.indexOf(fname), d);
            this.apiFlags.set(fname);
        }, data, error);
    }

    getAPIData(op: string): APIResponse {
        return this.apiDataCache.get(this.apiFlags.indexOf(op));
    }

    unsetFlags(ops: Array<string>) {
        for (const op of ops) {
            this.apiFlags.clear(op);
        }
    }

    testFlags(ops: Array<string>) {
        let b = true;
        for (const op of ops) {
            b = b && this.apiFlags.get(op);
        }
        return b;
    }

    searchFlags(searchStr: string): Array<string> {
        return this.apiFlags.searchNames(searchStr);
    }
}