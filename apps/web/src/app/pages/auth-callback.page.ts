import { Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-auth-callback',
  template: `
    <main id="main" class="callback-page" aria-labelledby="callback-title">
      <section class="callback-card" aria-live="polite">
        <p class="eyebrow">Nerys</p>
        <h1 id="callback-title">Connexion en cours</h1>
        <p>{{ message() }}</p>
      </section>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100svh;
    }
    .callback-page {
      min-height: 100svh;
      display: grid;
      place-items: center;
      padding: 1rem;
      background:
        radial-gradient(ellipse at center, rgba(19, 28, 67, 0.28), rgba(6, 10, 29, 0.72)),
        rgba(6, 10, 29, 0.34);
    }
    .callback-card {
      width: min(30rem, 100%);
      padding: 2rem;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 1.5rem;
      text-align: center;
      background: rgba(20, 27, 62, 0.62);
      backdrop-filter: blur(18px);
    }
    h1 {
      margin: 0.35rem 0;
      color: #fff8ea;
      font:
        600 clamp(2rem, 4vw, 3rem) 'Newsreader',
        serif;
    }
    p {
      margin: 0;
      color: rgba(255, 255, 255, 0.76);
    }
    .eyebrow {
      color: #d9d2ff;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      font-size: 0.76rem;
      font-weight: 700;
    }
  `,
})
export class AuthCallbackPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly message = signal('Nous vérifions votre session.');
  private completed = false;

  private readonly sessionWatcher = effect(async () => {
    if (this.completed || !this.auth.ready()) return;
    this.completed = true;
    try {
      if (!this.auth.authenticated()) throw new Error('Session OAuth introuvable.');
      await this.auth.completeOAuthProfile();
      await this.router.navigateByUrl('/tableau-de-bord');
    } catch {
      this.message.set('La connexion sociale a échoué. Revenez à la page de connexion.');
      setTimeout(() => void this.router.navigateByUrl('/connexion'), 1800);
    }
  });
}
