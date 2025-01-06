import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-pages',
  standalone: true,
  imports: [RouterOutlet, RouterModule],
  templateUrl: './pages.component.html',
  styleUrl: './pages.component.less'
})
export class PagesComponent {
  tabs = [
    {label: 'Playground', path: 'playground'},
    {label: 'Object Editing', path: 'object-editing'},
    {label: 'Drop Select', path: 'drop-select'}
  ];
}