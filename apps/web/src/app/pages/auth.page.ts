import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
@Component({
  selector: 'app-auth',
  imports: [ReactiveFormsModule, RouterLink],
  template: `<div class="shell narrow">
    <header class="topbar"><a class="brand" routerLink="/">ODYSSÉE</a></header>
    <main id="main" class="panel">
      <p class="eyebrow">Votre espace</p>
      <h2>Retrouvez vos aventures</h2>
      <form [formGroup]="form" (ngSubmit)="submit()" class="grid">
        <label class="field"
          >Adresse email<input type="email" formControlName="email" autocomplete="email" /></label
        ><label class="field"
          >Mot de passe<input
            type="password"
            formControlName="password"
            autocomplete="current-password" /></label
        ><button [disabled]="form.invalid">Continuer</button>
        <p aria-live="polite">{{ message() }}</p>
      </form>
      <p class="muted">
        En mode démonstration, vos données restent dans ce navigateur. Supabase Auth prend le relais
        une fois configuré.
      </p>
    </main>
  </div>`,
  styles: [
    `
      .narrow {
        max-width: 560px;
      }
      .panel {
        margin-top: 8vh;
      }
      button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    `,
  ],
})
export class AuthPage {
  readonly message = signal('');
  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
  });
  private readonly router = inject(Router);
  submit() {
    if (this.form.valid) {
      localStorage.setItem('odyssee_demo_user', this.form.controls.email.value);
      void this.router.navigateByUrl('/tableau-de-bord');
    }
  }
}
