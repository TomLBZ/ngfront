import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LoginService } from './login.service';
import { Observable, tap } from 'rxjs';

export const canActivateLoginGuard: CanActivateFn = (): Observable<boolean> => {
    const authService = inject(LoginService);
    const router = inject(Router);

    return authService.isLoggedIn().pipe(
        tap((isLoggedIn) => {
            if (!isLoggedIn) {
                console.log('Not logged in, redirecting to login page');
                router.navigate(['/login']);
            }
        })
    );
}