import { Component, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-auth',
  imports: [ReactiveFormsModule, RouterLink],
  template: `<div class="shell narrow">
    <header class="topbar"><a class="brand" routerLink="/">ODYSSÉE</a></header>
    <main id="main" class="panel">
      <p class="eyebrow">{{ signup() ? 'Créer un profil' : 'Votre espace' }}</p>
      <h2>{{ signup() ? 'Commencez votre odyssée' : 'Retrouvez vos aventures' }}</h2>
      @if (!auth.ready() || auth.authenticated()) {
        <p class="notice" aria-live="polite">Vérification de la session...</p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" class="grid">
          @if (signup()) {
            <label class="field"
              >Nom affiché<input formControlName="displayName" maxlength="80" autocomplete="name"
            /></label>
          }
          <label class="field"
            >Adresse email<input type="email" formControlName="email" autocomplete="email"
          /></label>
          <label class="field"
            >Mot de passe<input
              type="password"
              formControlName="password"
              [autocomplete]="signup() ? 'new-password' : 'current-password'"
          /></label>
          <button [disabled]="form.invalid || busy()">
            {{ busy() ? 'Connexion...' : signup() ? 'Créer mon compte' : 'Continuer' }}
          </button>
          <p class="notice" [class.error]="error()" aria-live="polite">{{ message() }}</p>
        </form>
        <button class="link" type="button" (click)="toggle()">
          {{ signup() ? "J'ai déjà un compte" : 'Créer un compte' }}
        </button>
        <p class="muted">
          Backend actif :
          <strong>{{ auth.backend() === 'mock' ? 'Mock local' : 'Supabase sécurisé' }}</strong
          >.
        </p>
      }
    </main>
  </div>`,
  styles: [
    `
      .narrow {
        max-width: 560px;
      }
      .panel {
        margin-top: 6vh;
      }
      button:disabled {
        opacity: 0.45;
      }
      .link {
        background: transparent;
        color: var(--accent);
        padding: 0.4rem 0;
      }
      .notice {
        min-height: 1.7rem;
      }
      .error {
        color: #ff9d9d;
      }
    `,
  ],
})
export class AuthPage {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly authenticatedRedirect = effect(() => {
    if (this.auth.ready() && this.auth.authenticated())
      void this.router.navigateByUrl('/tableau-de-bord');
  });
  readonly signup = signal(false);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly error = signal(false);
  readonly form = new FormGroup({
    displayName: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(80)] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
  });

  toggle(): void {
    this.signup.update((value) => !value);
    this.message.set('');
  }
  async submit(): Promise<void> {
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set(false);
    this.message.set('');
    try {
      if (this.signup())
        this.message.set(
          await this.auth.signUp(
            this.form.controls.email.value,
            this.form.controls.password.value,
            this.form.controls.displayName.value,
          ),
        );
      else
        await this.auth.signIn(this.form.controls.email.value, this.form.controls.password.value);
      if (this.auth.authenticated()) await this.router.navigateByUrl('/tableau-de-bord');
    } catch (error) {
      this.error.set(true);
      this.message.set(error instanceof Error ? error.message : 'Connexion impossible.');
    } finally {
      this.busy.set(false);
    }
  }
}
