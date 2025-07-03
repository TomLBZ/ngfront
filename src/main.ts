import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// This code applies a zoom fix for high DPI screens by scaling the body element.
// It ensures that the application appears at a consistent size regardless of the device's pixel ratio.
document.addEventListener('DOMContentLoaded', () => {
    const dpr = window.devicePixelRatio || 1;
    if (dpr !== 1) {
        const scale = 1 / dpr;
        // Apply transform scale to the entire body
        document.body.style.transformOrigin = 'top left';
        document.body.style.transform = `scale(${scale})`;
        // Adjust the body dimensions so that it still fills the full viewport
        document.body.style.width = `${100 * dpr}%`;
        document.body.style.height = `${100 * dpr}%`;
        document.body.style.overflow = 'hidden'; // Prevent scrollbars due to scaling
        console.log(`Zoom fix applied for DPR ${dpr}`);
    }
});

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));