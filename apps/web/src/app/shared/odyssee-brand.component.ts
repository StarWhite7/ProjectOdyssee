import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-odyssee-brand',
  imports: [RouterLink],
  template: `
    <a class="brand" routerLink="/" aria-label="Projet Odyssée, accueil">
      <svg class="compass" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="21" />
        <circle cx="32" cy="32" r="4" />
        <path d="M32 2v60M2 32h60M11 11l42 42M53 11 11 53" />
        <path class="needle" d="m32 8 5 19 19 5-19 5-5 19-5-19-19-5 19-5Z" />
      </svg>
      <span><small>Projet</small>Odyssée</span>
    </a>
  `,
  styles: `
    :host {
      display: inline-flex;
      width: max-content;
      color: inherit;
    }
    .brand {
      display: inline-flex;
      width: max-content;
      align-items: center;
      gap: 0.75rem;
      color: inherit;
      text-decoration: none;
      font:
        500 1.65rem 'Newsreader',
        serif;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }
    .brand small {
      display: block;
      margin-bottom: 0.15rem;
      font:
        500 0.66rem 'DM Sans',
        sans-serif;
      letter-spacing: 0.35em;
    }
    .compass {
      width: 4.25rem;
      height: 4.25rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 0.75;
      opacity: 0.8;
    }
    .compass .needle {
      fill: rgba(255, 255, 255, 0.1);
      stroke-width: 1;
    }
    a:focus-visible {
      outline: 3px solid rgba(255, 255, 255, 0.9);
      outline-offset: 3px;
    }
    @media (max-width: 540px) {
      .brand {
        gap: 0.5rem;
        font-size: 1.18rem;
      }
      .brand small {
        font-size: 0.5rem;
      }
      .compass {
        width: 3rem;
        height: 3rem;
      }
    }
  `,
})
export class OdysseeBrandComponent {}
