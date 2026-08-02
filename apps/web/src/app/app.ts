import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<a class="skip-link" href="#main">Aller au contenu</a><router-outlet />`,
  styleUrl: './app.scss',
})
export class App {}
