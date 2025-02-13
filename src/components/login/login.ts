import { Component, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppService } from '../../app/app.service';
import { Observable, map } from 'rxjs';

export const loginGuard: CanActivateFn = (): Observable<boolean> => {
    const service = inject(AppService);
    const router = inject(Router);
    const salt: string = localStorage.getItem('salt') || '';
    return service.uniPost('testlogin', { salt: salt }).pipe(
        map(res => {
            if (!res.success) {
                console.log('Not logged in, redirecting to login page');
                router.navigate(['/login']);
            }
            return res.success;
        })
    );
}

@Component({
    selector: 'login',
    templateUrl: './login.html',
    standalone: true
})

export class LoginComponent {
    username: string = '';
    password: string = '';
    loginError: boolean = false;

    constructor(private service: AppService, private router: Router) {}

    onUsernameChange(event: any): void {
        this.username = event.target.value;
    }

    onPasswordChange(event: any): void {
        this.password = event.target.value;
    }

    login(): void {
        this.service.uniPost('login', { name: this.username, password: this.password}).subscribe({
            next: (res) => {
                if (res.success) {
                    console.log('Logged in as ' + res.user);
                    localStorage.setItem('salt', res.salt);
                    this.router.navigate(['/pages']);
                } else {
                    this.loginError = true;
                }
            },
            error: (error) => {
                this.loginError = true;
                console.error(error);
            }
        });
    }
}