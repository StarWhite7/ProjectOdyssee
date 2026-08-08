import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-odyssee-brand',
  imports: [RouterLink],
  template: `
    <a class="brand" routerLink="/" aria-label="Nerys, accueil">
      <img
        class="brand-logo"
        [src]="logoSrc"
        alt="Nerys"
      />
    </a>
  `,
  styles: `
    :host {
      display: inline-flex;
      width: max-content;
      max-width: 100%;
      color: inherit;
    }
    .brand {
      display: inline-flex;
      width: max-content;
      max-width: 100%;
      align-items: center;
      color: inherit;
      text-decoration: none;
    }
    .brand-logo {
      display: block;
      width: var(--brand-logo-width, clamp(9rem, 10vw, 12rem));
      height: auto;
      max-width: 100%;
      object-fit: contain;
    }
    a:focus-visible {
      outline: 3px solid rgba(255, 255, 255, 0.9);
      outline-offset: 3px;
    }
    @media (max-width: 540px) {
      .brand-logo {
        width: var(--brand-logo-mobile-width, clamp(5.5rem, 30vw, 7rem));
      }
    }
  `,
})
export class OdysseeBrandComponent {
  @Input() logoSrc = '/images/branding/Logo_avec_nerys_droite.png';
}
