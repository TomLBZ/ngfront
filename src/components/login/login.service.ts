import { Injectable } from '@angular/core';
import { AppService } from '../../app/app.service';
import { Observable, map } from 'rxjs';

@Injectable({
    providedIn: 'root',
})

export class LoginService {
    private salt = "";

    constructor(private appService: AppService) {
        this.salt = localStorage.getItem('salt') || "";
    }

    login(username: string, password: string): Observable<any> {
        return this.appService.uniPost('login', { name: username, password: password });
    }

    setLoggedIn(salt: string = ""): void {
        this.salt = salt;
        localStorage.setItem('salt', salt);
    }

    isLoggedIn(): Observable<boolean> {
        return this.appService.uniPost('testlogin', { salt: this.salt }).pipe(
            map(res => res.success)
        )
    }
}