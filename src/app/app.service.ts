import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { env } from './app.config';

@Injectable({
  providedIn: 'root'
})
export class AppService {
    private apiUrl = env.apiUrl;
    constructor(private http: HttpClient) {}

    uniPost(op: string, payload: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/uniPost`, { op: op, data: payload });
    }

    rootGet(): Observable<any> {
        return this.http.get(`${this.apiUrl}`);
    }
}