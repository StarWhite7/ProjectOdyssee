import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-legal',
  imports: [RouterLink],
  template: `
    <main id="main" class="legal-page" aria-labelledby="legal-title">
      <section class="legal-card">
        <a routerLink="/connexion">Retour</a>
        <h1 id="legal-title">{{ title() }}</h1>
        <p>
          Cette page juridique doit être complétée avant la mise en production. Elle existe pour
          fournir une route interne réelle depuis le formulaire d'inscription.
        </p>
      </section>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100svh;
    }
    .legal-page {
      min-height: 100svh;
      display: grid;
      place-items: center;
      padding: 1rem;
      background: rgba(6, 10, 29, 0.58);
    }
    .legal-card {
      width: min(42rem, 100%);
      padding: 2rem;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 1.5rem;
      background: rgba(20, 27, 62, 0.66);
      backdrop-filter: blur(18px);
    }
    h1 {
      color: #fff8ea;
      font:
        600 clamp(2rem, 5vw, 3.4rem) 'Newsreader',
        serif;
    }
    p {
      color: rgba(255, 255, 255, 0.76);
    }
    a {
      color: #b9adff;
    }
  `,
})
export class LegalPage {
  private readonly router = inject(Router);
  readonly title = computed(() =>
    this.router.url.includes('confidentialite')
      ? 'Politique de confidentialité'
      : "Conditions d'utilisation",
  );
}
