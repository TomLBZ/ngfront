import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-pages',
  standalone: true,
  imports: [RouterOutlet, RouterModule],
  templateUrl: './pages.html',
  styleUrl: './pages.less'
})
export class PagesComponent {
  tabs = [
    {label: 'Playground', path: 'playground'},
    {label: 'Object Editing', path: 'object-editing'},
    {label: 'Drop Select', path: 'drop-select'}
  ];
}