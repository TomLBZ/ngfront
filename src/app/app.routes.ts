import { Routes } from '@angular/router';
import { PagesComponent } from './pages/pages';
import { LoginComponent, loginGuard } from '../components/login/login';
import { routes as pageRoutes } from './pages/pages.routes';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'pages', component: PagesComponent, canActivate: [loginGuard], children: pageRoutes },
    { path: '**', redirectTo: '/login' },
];