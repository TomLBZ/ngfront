import { ApplicationConfig, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { AppConfig } from './app.interface';
import { StructValidator } from '../utils/ds';

export const env: AppConfig = {
    apiUrl: "",
    wsUrl: "",
    mapKey: ""
};

function getConfig(jsonPath: string): Promise<AppConfig> {
    return new Promise((resolve, reject) => {
        fetch(jsonPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                resolve(data);
            })
            .catch(error => {
                console.error('Error loading config:', error);
                reject(error);
            });
    });
}

function applyConfig(config: AppConfig): void {
    env.apiUrl = config.apiUrl;
    env.wsUrl = config.wsUrl;
    env.mapKey = config.mapKey;
    if (StructValidator.hasNonEmptyFields(config, ['apiUrl', 'wsUrl', 'mapKey'])) {
        console.log('Config applied successfully:', config);
    } else {
        console.error('Config validation failed:', config);
        alert('Config validation failed. Please check the console for details.');
    }
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }), 
        provideRouter(routes),
        provideHttpClient(),
        provideAppInitializer(async () => {
            const config = await getConfig('./assets/config.json');
            applyConfig(config);
        }),
    ]
};