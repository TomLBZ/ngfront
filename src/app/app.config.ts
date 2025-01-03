import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
// import all the environment variables from the config file using a local namespace
import * as Config from '../configs/config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideHttpClient()
  ]
};

export const env = {
  production: false,
  apiUrl: Config.API_URL,
  mapKey: Config.MAP_KEY
};