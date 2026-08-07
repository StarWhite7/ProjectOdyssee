import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-password-reset',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main id="main" class="reset-page" aria-labelledby="reset-title">
      <section class="reset-card">
        <a class="brand-link" routerLink="/">Projet Odyssée</a>
        <h1 id="reset-title">Nouveau mot de passe</h1>
        @if (!auth.ready()) {
          <p class="notice" aria-live="polite">Vérification de votre lien...</p>
        } @else if (!auth.authenticated()) {
          <p class="notice error" aria-live="polite">
            Ce lien de réinitialisation n'est plus actif. Demandez un nouveau lien.
          </p>
          <a class="button-link" routerLink="/connexion">Retour à la connexion</a>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <label for="new-password">Mot de passe</label>
            <input
              id="new-password"
              type="password"
              autocomplete="new-password"
              formControlName="password"
              [attr.aria-invalid]="showPasswordError()"
            />
            @if (showPasswordError()) {
              <p class="field-error">Le mot de passe doit contenir au moins 8 caractères.</p>
            }
            <button type="submit" [disabled]="busy()" [attr.aria-busy]="busy()">
              {{ busy() ? 'Mise à jour...' : 'Mettre à jour' }}
            </button>
          </form>
          @if (message()) {
            <p class="notice" [class.error]="error()" aria-live="polite">{{ message() }}</p>
          }
        }
      </section>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100svh;
    }
    .reset-page {
      min-height: 100svh;
      display: grid;
      place-items: center;
      padding: 1rem;
      background:
        radial-gradient(ellipse at center, rgba(24, 34, 80, 0.26), rgba(5, 8, 25, 0.72)),
        rgba(5, 8, 25, 0.36);
    }
    .reset-card {
      width: min(28rem, 100%);
      padding: 2rem;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 1.5rem;
      background: rgba(20, 27, 62, 0.66);
      backdrop-filter: blur(18px);
      box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
    }
    .brand-link {
      color: #fff8ea;
      text-decoration: none;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      font-size: 0.78rem;
      font-weight: 700;
    }
    h1 {
      margin: 0.7rem 0 1.5rem;
      color: #fff8ea;
      font:
        600 clamp(2rem, 4vw, 2.8rem) 'Newsreader',
        serif;
    }
    form {
      display: grid;
      gap: 0.75rem;
    }
    label {
      color: rgba(255, 255, 255, 0.82);
      font-size: 0.9rem;
    }
    input {
      min-height: 2.9rem;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 0.8rem;
      color: #fff;
      background: rgba(14, 20, 49, 0.58);
    }
    button,
    .button-link {
      min-height: 2.85rem;
      border: 0;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: white;
      background: linear-gradient(120deg, #7769ec, #4a4eb8);
      text-decoration: none;
      font-weight: 700;
    }
    button:disabled {
      cursor: wait;
      opacity: 0.65;
    }
    .notice,
    .field-error {
      margin: 0;
      color: rgba(255, 255, 255, 0.76);
      line-height: 1.5;
    }
    .error,
    .field-error {
      color: #ffd3d3;
    }
  `,
})
export class PasswordResetPage {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly submitted = signal(false);
  readonly message = signal('');
  readonly error = signal(false);
  readonly form = new FormGroup({
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
  });
  readonly showPasswordError = computed(
    () =>
      this.form.controls.password.invalid &&
      (this.form.controls.password.touched || this.submitted()),
  );

  async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set(false);
    this.message.set('');
    try {
      await this.auth.updatePassword(this.form.controls.password.value);
      this.message.set('Votre mot de passe a été mis à jour.');
      await this.router.navigateByUrl('/tableau-de-bord');
    } catch {
      this.error.set(true);
      this.message.set('Impossible de mettre à jour le mot de passe pour le moment.');
    } finally {
      this.busy.set(false);
    }
  }
}
