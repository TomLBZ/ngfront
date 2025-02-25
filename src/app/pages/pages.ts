import { Component, OnInit } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-pages',
    standalone: true,
    imports: [RouterOutlet, RouterModule],
    templateUrl: './pages.html'
})
export class PagesComponent implements OnInit {
    tabs = [
        {label: 'Playground', path: 'playground'},
        {label: 'Object Editing', path: 'object-editing'},
        {label: 'Drop Select', path: 'drop-select'},
        {label: 'Controls', path: 'controls'},
        {label: 'Monitor', path: 'monitor'},
        {label: 'Path Edit', path: 'path-edit'},
        {label: 'Logs', path: 'logs'}
    ];
    selectedTabPath = 'playground';
    private helpStrMultiline = `Help
    Multiline Help Item 1:
      Left: Do something.
        Hello World.
    Multiline Help Item 2: abcd.
    `;
    ngOnInit(): void {
        const path = window.location.pathname;
        this.selectedTabPath = path.split('/').pop() as any;
    }
    showHelp() {
        alert(this.helpStrMultiline);
    }
    logOut() {
        alert('Logging out...');
        localStorage.removeItem('salt');
        window.location.href = '/';
    }
    onLinkClicked(event: any) {
        const path = event.target.pathname;
        this.selectedTabPath = path.split('/').pop();
    }
}