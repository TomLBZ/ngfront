import { Routes } from '@angular/router';
import { PagesComponent } from './pages/pages.component';
import { LoginComponent } from '../components/login/login';
import { canActivateLoginGuard } from '../components/login/login.guard';
import { routes as homeroutes } from './pages/pages.routes';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'pages', component: PagesComponent, canActivate: [canActivateLoginGuard], children: homeroutes },
    { path: '**', redirectTo: '/login' },
];