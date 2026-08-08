import { Component, computed, inject, signal, type WritableSignal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

const TERMS_PATH = '/conditions-utilisation';
const PRIVACY_PATH = '/confidentialite';

@Component({
  selector: 'app-auth',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main id="main" class="auth-page" aria-labelledby="auth-title">
      <div class="auth-overlay top"></div>
      <div class="auth-overlay center"></div>
      <div class="auth-overlay bottom"></div>

      <section class="auth-shell">
        <header class="auth-brand">
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="21" />
            <circle cx="32" cy="32" r="4" />
            <path d="M32 2v60M2 32h60M11 11l42 42M53 11 11 53" />
            <path d="m32 8 5 19 19 5-19 5-5 19-5-19-19-5 19-5Z" />
          </svg>
          <p>Nerys</p>
          <h1 id="auth-title">Nerys</h1>
          <span>Écrivez votre légende</span>
        </header>

        @if (!auth.ready() || auth.authenticated()) {
          <section class="auth-panel pending-panel" aria-live="polite">
            <p>Vérification de la session...</p>
          </section>
        } @else {
          <section class="auth-panel" aria-label="Connexion et création de compte">
            <form class="auth-column" [formGroup]="loginForm" (ngSubmit)="submitLogin()" novalidate>
              <h2>Connexion</h2>
              <div class="ornament" aria-hidden="true"><span></span></div>

              <label class="field" for="login-email">
                <span>Adresse e-mail</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 5h16v14H4z M4 7l8 6 8-6" />
                </svg>
                <input
                  id="login-email"
                  type="email"
                  formControlName="email"
                  autocomplete="email"
                  placeholder="Adresse e-mail"
                  [attr.aria-invalid]="showLoginEmailError()"
                />
              </label>
              @if (showLoginEmailError()) {
                <p class="field-error">{{ emailError(loginForm.controls.email) }}</p>
              }

              <label class="field" for="login-password">
                <span>Mot de passe</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 10V8a5 5 0 0 1 10 0v2 M6 10h12v10H6z" />
                </svg>
                <input
                  id="login-password"
                  [type]="showLoginPassword() ? 'text' : 'password'"
                  formControlName="password"
                  autocomplete="current-password"
                  placeholder="Mot de passe"
                  [attr.aria-invalid]="showLoginPasswordError()"
                />
                <button
                  class="field-action"
                  type="button"
                  (click)="showLoginPassword.update(toggle)"
                  [attr.aria-label]="
                    showLoginPassword() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                  "
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
                    <path d="M4 4l16 16" />
                  </svg>
                </button>
              </label>
              @if (showLoginPasswordError()) {
                <p class="field-error">Le mot de passe est requis.</p>
              }

              <div class="form-row end">
                <button class="text-button" type="button" (click)="sendResetLink()">
                  Mot de passe oublié ?
                </button>
              </div>

              <button
                class="primary-action"
                type="submit"
                [disabled]="loginBusy()"
                [attr.aria-busy]="loginBusy()"
              >
                {{ loginBusy() ? 'Connexion...' : 'Se connecter' }}
              </button>

              @if (loginMessage()) {
                <p class="form-message" [class.error]="loginError()" aria-live="polite">
                  {{ loginMessage() }}
                </p>
              }

              <div class="social-block">
                <span>ou continuer avec</span>
                <div class="social-actions">
                  <button
                    type="button"
                    class="social-button google"
                    aria-label="Continuer avec Google"
                    [disabled]="socialBusy()"
                    (click)="continueWithGoogle()"
                  >
                    <img src="/icons/auth/google.svg" alt="" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    class="social-button discord"
                    aria-label="Continuer avec Discord"
                    [disabled]="socialBusy()"
                    (click)="continueWithDiscord()"
                  >
                    <img src="/icons/auth/discord.svg" alt="" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </form>

            <div class="auth-divider" aria-hidden="true">
              <i></i>
              <span>OU</span>
              <i></i>
            </div>

            <form
              class="auth-column"
              [formGroup]="registerForm"
              (ngSubmit)="submitRegister()"
              novalidate
            >
              <h2>Créer un compte</h2>
              <div class="ornament" aria-hidden="true"><span></span></div>

              <label class="field" for="register-name">
                <span>Pseudo</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 21a8 8 0 0 0-16 0 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                </svg>
                <input
                  id="register-name"
                  formControlName="displayName"
                  autocomplete="name"
                  maxlength="80"
                  placeholder="Pseudo"
                  [attr.aria-invalid]="showDisplayNameError()"
                />
              </label>
              @if (showDisplayNameError()) {
                <p class="field-error">Le pseudo est requis.</p>
              }

              <label class="field" for="register-email">
                <span>Adresse e-mail</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 5h16v14H4z M4 7l8 6 8-6" />
                </svg>
                <input
                  id="register-email"
                  type="email"
                  formControlName="email"
                  autocomplete="email"
                  placeholder="Adresse e-mail"
                  [attr.aria-invalid]="showRegisterEmailError()"
                />
              </label>
              @if (showRegisterEmailError()) {
                <p class="field-error">{{ emailError(registerForm.controls.email) }}</p>
              }

              <label class="field" for="register-password">
                <span>Mot de passe</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 10V8a5 5 0 0 1 10 0v2 M6 10h12v10H6z" />
                </svg>
                <input
                  id="register-password"
                  [type]="showRegisterPassword() ? 'text' : 'password'"
                  formControlName="password"
                  autocomplete="new-password"
                  placeholder="Mot de passe"
                  [attr.aria-invalid]="showRegisterPasswordError()"
                />
                <button
                  class="field-action"
                  type="button"
                  (click)="showRegisterPassword.update(toggle)"
                  [attr.aria-label]="
                    showRegisterPassword() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                  "
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
                    <path d="M4 4l16 16" />
                  </svg>
                </button>
              </label>
              @if (showRegisterPasswordError()) {
                <p class="field-error">Le mot de passe doit contenir au moins 8 caractères.</p>
              }

              <label class="terms">
                <input type="checkbox" formControlName="acceptedTerms" />
                <span>
                  J'accepte les
                  <a [routerLink]="termsPath">Conditions d'utilisation</a>
                  et la
                  <a [routerLink]="privacyPath">Politique de confidentialité</a>
                </span>
              </label>
              @if (showTermsError()) {
                <p class="field-error">Vous devez accepter les conditions.</p>
              }

              <button
                class="primary-action"
                type="submit"
                [disabled]="registerBusy()"
                [attr.aria-busy]="registerBusy()"
              >
                {{ registerBusy() ? 'Création...' : 'Créer mon compte' }}
              </button>

              @if (registerMessage()) {
                <p class="form-message" [class.error]="registerError()" aria-live="polite">
                  {{ registerMessage() }}
                </p>
              }

              <div class="social-block">
                <span>ou continuer avec</span>
                <div class="social-actions">
                  <button
                    type="button"
                    class="social-button google"
                    aria-label="Continuer avec Google"
                    [disabled]="socialBusy()"
                    (click)="continueWithGoogle()"
                  >
                    <img src="/icons/auth/google.svg" alt="" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    class="social-button discord"
                    aria-label="Continuer avec Discord"
                    [disabled]="socialBusy()"
                    (click)="continueWithDiscord()"
                  >
                    <img src="/icons/auth/discord.svg" alt="" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </form>
          </section>
        }

        <footer class="auth-quote">
          <p>Chaque histoire commence par un choix.<br />Le vôtre commence ici.</p>
          <span aria-hidden="true"></span>
        </footer>
      </section>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100svh;
    }
    .auth-page {
      position: relative;
      width: 100%;
      height: 100svh;
      min-height: 100svh;
      overflow: hidden;
      color: #fff8ea;
      background: rgba(7, 11, 31, 0.08);
    }
    .auth-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .auth-overlay.top {
      background: linear-gradient(
        180deg,
        rgba(6, 10, 29, 0.28),
        rgba(6, 10, 29, 0.04) 44%,
        transparent
      );
    }
    .auth-overlay.center {
      background:
        radial-gradient(ellipse at 50% 48%, transparent 24%, rgba(10, 16, 43, 0.16)),
        linear-gradient(
          180deg,
          rgba(9, 15, 42, 0.28),
          rgba(12, 18, 47, 0.1) 44%,
          rgba(9, 14, 39, 0.28)
        );
    }
    .auth-overlay.bottom {
      background: linear-gradient(180deg, transparent 70%, rgba(7, 11, 31, 0.34));
    }
    .auth-shell {
      position: relative;
      z-index: 1;
      height: 100%;
      display: grid;
      grid-template-rows: auto minmax(0, auto) auto;
      align-content: center;
      justify-items: center;
      gap: clamp(1.125rem, 2.2vh, 1.875rem);
      padding: clamp(1.25rem, 3vh, 2.375rem) clamp(1.5rem, 4vw, 4.5rem);
    }
    .auth-brand {
      display: grid;
      justify-items: center;
      width: min(390px, 32vw);
      margin-bottom: clamp(0.25rem, 0.6vh, 0.625rem);
      color: #fff8ea;
      text-align: center;
      text-shadow: 0 2px 18px rgba(6, 10, 29, 0.34);
    }
    .auth-brand svg {
      width: clamp(2.8rem, 5.6vh, 4.2rem);
      height: clamp(2.8rem, 5.6vh, 4.2rem);
      fill: none;
      stroke: currentColor;
      stroke-width: 0.75;
    }
    .auth-brand p,
    .auth-brand span {
      margin: 0;
      letter-spacing: 0.24em;
      text-transform: uppercase;
    }
    .auth-brand p {
      font-size: clamp(0.76rem, 1.5vh, 0.95rem);
    }
    .auth-brand h1 {
      margin: 0.08rem 0;
      font:
        600 clamp(2.875rem, 4.2vw, 4.5rem) / 0.92 'Newsreader',
        serif;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .auth-brand span {
      font:
        600 clamp(0.66rem, 1.25vh, 0.78rem) 'DM Sans',
        sans-serif;
    }
    .auth-panel {
      width: min(1040px, 82vw);
      height: min(570px, 62vh);
      min-height: 470px;
      max-height: min(570px, 62vh);
      padding: clamp(1.875rem, 4vh, 2.875rem) clamp(2.125rem, 4vw, 3.625rem);
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 1.75rem;
      display: grid;
      grid-template-columns: minmax(0, 1fr) clamp(3.125rem, 5vw, 4.625rem) minmax(0, 1fr);
      align-items: stretch;
      gap: 0;
      background:
        linear-gradient(135deg, rgba(77, 72, 122, 0.5), rgba(18, 27, 65, 0.6)),
        rgba(14, 19, 45, 0.46);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.12),
        0 28px 80px rgba(8, 12, 35, 0.32);
      backdrop-filter: blur(18px);
    }
    .pending-panel {
      grid-template-columns: 1fr;
      place-items: center;
      text-align: center;
    }
    .auth-column {
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: clamp(0.75rem, 1.35vh, 1rem);
      padding-inline: clamp(0.35rem, 1vw, 0.75rem);
    }
    h2 {
      margin: 0;
      color: #fff;
      text-align: center;
      font:
        600 clamp(1.5rem, 1.7vw, 1.95rem) 'Newsreader',
        serif;
    }
    .ornament {
      height: clamp(0.85rem, 1.35vh, 1.05rem);
      display: grid;
      place-items: center;
      margin-bottom: clamp(0.25rem, 0.7vh, 0.45rem);
    }
    .ornament::before {
      content: '';
      width: 4.2rem;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.46), transparent);
    }
    .ornament span {
      position: absolute;
      width: 0.34rem;
      height: 0.34rem;
      background: #fff8ea;
      transform: rotate(45deg);
    }
    .field {
      position: relative;
      display: block;
    }
    .field > span {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
    .field > svg {
      position: absolute;
      left: 0.95rem;
      top: 50%;
      width: 1.12rem;
      height: 1.12rem;
      transform: translateY(-50%);
      fill: none;
      stroke: rgba(255, 255, 255, 0.72);
      stroke-width: 1.6;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    input {
      width: 100%;
      min-height: clamp(3rem, 5vh, 3.5rem);
      padding: 0.78rem 2.85rem 0.78rem 2.85rem;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 0.72rem;
      color: #fff;
      background: rgba(18, 24, 54, 0.42);
      font-size: clamp(0.94rem, 0.9vw, 1rem);
      outline: none;
    }
    input::placeholder {
      color: rgba(223, 225, 241, 0.56);
    }
    input:focus {
      border-color: rgba(163, 151, 255, 0.72);
      box-shadow: 0 0 0 2px rgba(122, 108, 229, 0.18);
    }
    .field-action {
      position: absolute;
      top: 50%;
      right: 0.62rem;
      width: 2rem;
      height: 2rem;
      padding: 0;
      border: 0;
      border-radius: 50%;
      color: rgba(255, 255, 255, 0.72);
      background: transparent;
      transform: translateY(-50%);
    }
    .field-action svg {
      width: 1.05rem;
      height: 1.05rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.7;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .form-row {
      display: flex;
      align-items: center;
      min-height: 1.875rem;
    }
    .form-row.end {
      justify-content: flex-end;
    }
    .text-button {
      padding: 0;
      border: 0;
      color: #b9adff;
      background: transparent;
      font-size: clamp(0.78rem, 1.25vh, 0.9rem);
      text-decoration: underline;
      text-underline-offset: 0.18em;
    }
    .primary-action {
      min-height: clamp(3rem, 5vh, 3.375rem);
      padding: 0.7rem 1rem;
      border: 0;
      border-radius: 999px;
      color: white;
      background: linear-gradient(120deg, #7768ed, #4b4db8);
      box-shadow: 0 14px 28px rgba(55, 49, 139, 0.26);
      font-size: 0.95rem;
      font-weight: 700;
    }
    button:disabled {
      cursor: wait;
      opacity: 0.62;
    }
    .field-error,
    .form-message {
      margin: -0.22rem 0 0;
      min-height: 1rem;
      color: #ffd3d3;
      font-size: clamp(0.72rem, 1.1vh, 0.82rem);
      line-height: 1.35;
    }
    .form-message {
      color: rgba(255, 255, 255, 0.78);
      text-align: center;
    }
    .form-message.error {
      color: #ffd3d3;
    }
    .terms {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 0.65rem;
      color: rgba(255, 255, 255, 0.74);
      font-size: clamp(0.72rem, 1.1vh, 0.84rem);
      line-height: 1.45;
    }
    .terms input {
      width: 1rem;
      min-height: 1rem;
      margin: 0.1rem 0 0;
      padding: 0;
      accent-color: #8173ff;
    }
    a {
      color: #b9adff;
    }
    .social-block {
      margin-top: clamp(0.45rem, 1.2vh, 0.75rem);
      display: grid;
      gap: clamp(0.65rem, 1.2vh, 0.9rem);
      justify-items: center;
      color: rgba(255, 255, 255, 0.8);
      font-size: clamp(0.78rem, 1.15vh, 0.9rem);
    }
    .social-actions {
      display: flex;
      gap: clamp(0.875rem, 1vw, 1.125rem);
    }
    .social-button {
      width: clamp(2.75rem, 4.8vh, 3.125rem);
      height: clamp(2.75rem, 4.8vh, 3.125rem);
      padding: 0;
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: #fff;
      background: rgba(255, 255, 255, 0.06);
      font-weight: 800;
    }
    .social-button.google {
      background: rgba(255, 255, 255, 0.08);
    }
    .social-button img {
      display: block;
      width: 22px;
      height: 22px;
      object-fit: contain;
    }
    .auth-divider {
      display: grid;
      grid-template-rows: 1fr auto 1fr;
      justify-items: center;
      align-items: center;
      gap: 0.75rem;
      color: #fff;
      font-weight: 600;
    }
    .auth-divider i {
      width: 1px;
      height: 100%;
      background: linear-gradient(transparent, rgba(255, 255, 255, 0.38), transparent);
    }
    .auth-divider span {
      width: clamp(2.625rem, 4.4vh, 3rem);
      height: clamp(2.625rem, 4.4vh, 3rem);
      border: 1px solid rgba(255, 255, 255, 0.36);
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: rgba(35, 42, 82, 0.72);
    }
    .auth-quote {
      display: grid;
      justify-items: center;
      gap: clamp(0.35rem, 0.9vh, 0.65rem);
      color: #fff8ea;
      text-align: center;
      text-shadow: 0 2px 18px rgba(6, 10, 29, 0.36);
    }
    .auth-quote p {
      margin: 0;
      color: inherit;
      font:
        500 clamp(1rem, 1.15vw, 1.25rem) / 1.35 'Newsreader',
        serif;
    }
    .auth-quote span {
      width: 10rem;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), transparent);
    }
    button:focus-visible,
    a:focus-visible,
    input:focus-visible {
      outline: 3px solid rgba(255, 255, 255, 0.88);
      outline-offset: 3px;
    }
    @media (max-height: 900px) {
      .auth-shell {
        gap: 1rem;
        padding-block: 1rem;
      }
      .auth-panel {
        height: min(540px, 62vh);
        min-height: 455px;
        padding-block: 1.5rem;
      }
    }
    @media (max-height: 800px) {
      .auth-brand svg {
        width: 2.5rem;
        height: 2.5rem;
      }
      .auth-brand h1 {
        font-size: 2.9rem;
      }
      .auth-panel {
        height: min(500px, 63vh);
        min-height: 440px;
        padding-block: 1.25rem;
      }
      .auth-column {
        gap: 0.55rem;
      }
      input,
      .primary-action {
        min-height: 2.875rem;
      }
      .social-button {
        width: 2.75rem;
        height: 2.75rem;
      }
      .auth-quote p {
        font-size: 1rem;
      }
    }
    @media (max-height: 720px) {
      .auth-brand span {
        display: none;
      }
      .auth-panel {
        height: min(450px, 64vh);
        min-height: 0;
        padding: 0.9rem 1.35rem;
      }
      input,
      .primary-action {
        min-height: 2.65rem;
      }
      .social-block {
        gap: 0.35rem;
        margin-top: 0.2rem;
      }
      .auth-quote span {
        display: none;
      }
    }
    @media (max-width: 900px) {
      .auth-page {
        height: auto;
        overflow: visible;
      }
      .auth-shell {
        min-height: 100svh;
        height: auto;
        padding-bottom: 5.5rem;
      }
      .auth-panel {
        width: min(38rem, calc(100vw - 1.5rem));
        height: auto;
        min-height: 0;
        max-height: none;
        grid-template-columns: 1fr;
      }
      .auth-divider {
        width: 100%;
        height: 2.4rem;
        grid-template-rows: none;
        grid-template-columns: 1fr auto 1fr;
      }
      .auth-divider i {
        width: 100%;
        height: 1px;
      }
      .auth-column {
        min-height: auto;
      }
    }
  `,
})
export class AuthPage {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly termsPath = TERMS_PATH;
  readonly privacyPath = PRIVACY_PATH;
  readonly loginBusy = signal(false);
  readonly registerBusy = signal(false);
  readonly googleBusy = signal(false);
  readonly discordBusy = signal(false);
  readonly resetBusy = signal(false);
  readonly loginSubmitted = signal(false);
  readonly registerSubmitted = signal(false);
  readonly loginMessage = signal('');
  readonly registerMessage = signal('');
  readonly loginError = signal(false);
  readonly registerError = signal(false);
  readonly showLoginPassword = signal(false);
  readonly showRegisterPassword = signal(false);
  readonly socialBusy = computed(() => this.googleBusy() || this.discordBusy());
  readonly toggle = (value: boolean) => !value;
  readonly loginForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
  readonly registerForm = new FormGroup({
    displayName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    acceptedTerms: new FormControl(false, {
      nonNullable: true,
      validators: [Validators.requiredTrue],
    }),
  });
  readonly showLoginEmailError = computed(() =>
    this.shouldShow(this.loginForm.controls.email, this.loginSubmitted()),
  );
  readonly showLoginPasswordError = computed(() =>
    this.shouldShow(this.loginForm.controls.password, this.loginSubmitted()),
  );
  readonly showDisplayNameError = computed(() =>
    this.shouldShow(this.registerForm.controls.displayName, this.registerSubmitted()),
  );
  readonly showRegisterEmailError = computed(() =>
    this.shouldShow(this.registerForm.controls.email, this.registerSubmitted()),
  );
  readonly showRegisterPasswordError = computed(() =>
    this.shouldShow(this.registerForm.controls.password, this.registerSubmitted()),
  );
  readonly showTermsError = computed(() =>
    this.shouldShow(this.registerForm.controls.acceptedTerms, this.registerSubmitted()),
  );

  async submitLogin(): Promise<void> {
    this.loginSubmitted.set(true);
    if (this.loginForm.invalid || this.loginBusy()) return;
    this.loginBusy.set(true);
    this.loginError.set(false);
    this.loginMessage.set('');
    try {
      await this.auth.signIn(
        this.loginForm.controls.email.value.trim(),
        this.loginForm.controls.password.value,
      );
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.loginError.set(true);
      this.loginMessage.set(this.authErrorMessage(error));
    } finally {
      this.loginBusy.set(false);
    }
  }

  async submitRegister(): Promise<void> {
    this.registerSubmitted.set(true);
    this.registerForm.controls.displayName.setValue(
      this.registerForm.controls.displayName.value.trim(),
    );
    if (this.registerForm.invalid || this.registerBusy()) return;
    this.registerBusy.set(true);
    this.registerError.set(false);
    this.registerMessage.set('');
    try {
      const message = await this.auth.signUp(
        this.registerForm.controls.email.value.trim(),
        this.registerForm.controls.password.value,
        this.registerForm.controls.displayName.value,
      );
      this.registerMessage.set(message);
      if (this.auth.authenticated()) await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.registerError.set(true);
      this.registerMessage.set(this.authErrorMessage(error));
    } finally {
      this.registerBusy.set(false);
    }
  }

  async sendResetLink(): Promise<void> {
    this.loginSubmitted.set(true);
    const email = this.loginForm.controls.email.value.trim();
    if (this.loginForm.controls.email.invalid || this.resetBusy()) return;
    this.resetBusy.set(true);
    this.loginError.set(false);
    this.loginMessage.set('');
    try {
      await this.auth.resetPassword(email);
      this.loginMessage.set(
        'Si un compte correspond à cette adresse, un lien de réinitialisation a été envoyé.',
      );
    } catch (error) {
      this.loginError.set(true);
      this.loginMessage.set(this.authErrorMessage(error));
    } finally {
      this.resetBusy.set(false);
    }
  }

  async continueWithGoogle(): Promise<void> {
    await this.continueWithProvider('Google', this.googleBusy, () => this.auth.signInWithGoogle());
  }

  async continueWithDiscord(): Promise<void> {
    await this.continueWithProvider('Discord', this.discordBusy, () =>
      this.auth.signInWithDiscord(),
    );
  }

  private async continueWithProvider(
    providerLabel: 'Google' | 'Discord',
    busy: WritableSignal<boolean>,
    signIn: () => Promise<void>,
  ): Promise<void> {
    if (busy()) return;
    busy.set(true);
    this.loginError.set(false);
    this.registerError.set(false);
    this.loginMessage.set('');
    this.registerMessage.set('');
    try {
      await signIn();
    } catch (error) {
      console.error(`OAuth ${providerLabel} failed`, error);
      const message = this.oauthErrorMessage(error, providerLabel);
      this.loginError.set(true);
      this.registerError.set(true);
      this.loginMessage.set(message);
      this.registerMessage.set(message);
      busy.set(false);
    }
  }

  emailError(control: FormControl<string>): string {
    if (control.hasError('required')) return "L'adresse e-mail est requise.";
    return 'Saisissez une adresse e-mail valide.';
  }

  private shouldShow(control: FormControl<unknown>, submitted: boolean): boolean {
    return control.invalid && (control.touched || submitted);
  }

  private authErrorMessage(error: unknown): string {
    const raw = error instanceof Error ? error.message.toLowerCase() : '';
    if (raw.includes('invalid login')) return 'Identifiants invalides.';
    if (raw.includes('email not confirmed')) return "L'adresse e-mail n'est pas encore confirmée.";
    if (raw.includes('already') || raw.includes('registered'))
      return 'Cette adresse e-mail est déjà utilisée.';
    if (raw.includes('weak') || raw.includes('password')) return 'Le mot de passe est insuffisant.';
    if (raw.includes('oauth') || raw.includes('provider'))
      return 'Ce fournisseur de connexion doit être configuré.';
    return 'Connexion impossible pour le moment.';
  }

  private oauthErrorMessage(error: unknown, providerLabel: 'Google' | 'Discord'): string {
    const raw = error instanceof Error ? error.message.toLowerCase() : '';
    if (
      raw.includes('unsupported provider') ||
      raw.includes('provider is not enabled') ||
      raw.includes('not enabled') ||
      raw.includes('provider')
    ) {
      return `La connexion avec ${providerLabel} n'est pas encore disponible.`;
    }
    return `La connexion avec ${providerLabel} est impossible pour le moment.`;
  }
}
