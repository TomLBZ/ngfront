import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from './login.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'login',
    templateUrl: './login.html',
    styleUrls: ['./login.less'],
    standalone: true,
    imports: [FormsModule]
})

export class LoginComponent {
    username: string = '';
    password: string = '';
    loginError: boolean = false;

    constructor(private authService: LoginService, private router: Router) {}

    login(): void {
        this.authService.login(this.username, this.password).subscribe({
            next: (res) => {
                console.log(res);
                if (res.success) {
                    this.authService.setLoggedIn(res.salt);
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