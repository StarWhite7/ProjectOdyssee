import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-settings-page',
  template: `
    <section class="dashboard-subpage" aria-labelledby="settings-title">
      <header class="page-header">
        <p>Paramètres</p>
        <h1 id="settings-title">Préférences du compte</h1>
      </header>

      <div class="settings-grid">
        <section class="panel" aria-labelledby="profile-title">
          <h2 id="profile-title">Profil</h2>
          <div class="profile-row">
            <span class="avatar" aria-hidden="true">{{ userInitial() }}</span>
            <div>
              <strong>{{ userName() }}</strong>
              <p>Pseudo public utilisé dans vos aventures.</p>
            </div>
          </div>
          <label>
            Pseudo
            <input type="text" [value]="userName()" disabled />
          </label>
        </section>

        <section class="panel" aria-labelledby="account-title">
          <h2 id="account-title">Compte</h2>
          <dl>
            <div>
              <dt>Email</dt>
              <dd>{{ userEmail() }}</dd>
            </div>
            <div>
              <dt>Mot de passe</dt>
              <dd>La modification passera par le flux sécurisé existant.</dd>
            </div>
            <div>
              <dt>Fournisseurs connectés</dt>
              <dd>Google et Discord seront affichés ici quand Supabase les exposera.</dd>
            </div>
          </dl>
        </section>

        <section class="panel" aria-labelledby="experience-title">
          <h2 id="experience-title">Expérience</h2>
          <div class="setting-line">
            <div>
              <strong>Musique d'ambiance</strong>
              <p>Le lecteur reste dans la sidebar et conserve volume, lecture et sourdine.</p>
            </div>
            <span class="pill">Persistante</span>
          </div>
          <div class="setting-line">
            <div>
              <strong>Animations</strong>
              <p>Les animations suivent les préférences système du navigateur.</p>
            </div>
            <span class="pill">Auto</span>
          </div>
        </section>

        <section class="panel" aria-labelledby="privacy-title">
          <h2 id="privacy-title">Confidentialité</h2>
          <p>
            Les réglages de données et la suppression de compte seront ajoutés uniquement quand la
            logique serveur correspondante sera disponible.
          </p>
          <button type="button" disabled>Demander une exportation</button>
        </section>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      min-height: 0;
    }
    .dashboard-subpage {
      height: 100%;
      min-height: 0;
      padding: clamp(1.35rem, 3vh, 2.65rem) clamp(1.7rem, 3.2vw, 3.4rem);
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      gap: clamp(0.9rem, 1.8vh, 1.4rem);
      overflow: hidden;
      color: #17264e;
    }
    .page-header p,
    h2 {
      margin: 0;
      color: #18264d;
      font: 700 0.78rem 'DM Sans', sans-serif;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0.3rem 0 0;
      font: 600 clamp(2rem, 3vw, 3.3rem) / 1 'Newsreader', serif;
      color: #18264d;
      letter-spacing: 0;
    }
    .settings-grid {
      min-height: 0;
      overflow: auto;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-content: start;
      gap: 1rem;
      padding-right: 0.2rem;
    }
    .panel {
      padding: 1.15rem;
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 1rem;
      color: white;
      background: rgba(16, 27, 62, 0.52);
      backdrop-filter: blur(12px);
      box-shadow: 0 18px 45px rgba(15, 23, 56, 0.14);
    }
    .profile-row,
    .setting-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-top: 1rem;
    }
    .avatar {
      width: 3.1rem;
      aspect-ratio: 1;
      border: 1px solid rgba(255, 255, 255, 0.44);
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: rgba(255, 255, 255, 0.12);
      font-weight: 700;
    }
    strong {
      color: white;
      font-size: 1rem;
    }
    p,
    dd {
      margin: 0.25rem 0 0;
      color: rgba(255, 255, 255, 0.78);
      line-height: 1.45;
    }
    label {
      display: grid;
      gap: 0.4rem;
      margin-top: 1rem;
      color: rgba(255, 255, 255, 0.68);
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    input {
      min-height: 2.65rem;
      padding: 0 0.9rem;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 0.75rem;
      color: rgba(255, 255, 255, 0.82);
      background: rgba(255, 255, 255, 0.08);
    }
    dl {
      display: grid;
      gap: 0.9rem;
      margin: 1rem 0 0;
    }
    dt {
      color: rgba(255, 255, 255, 0.62);
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .pill {
      flex: 0 0 auto;
      padding: 0.25rem 0.58rem;
      border: 1px solid rgba(255, 255, 255, 0.24);
      border-radius: 999px;
      color: rgba(255, 255, 255, 0.86);
      font-size: 0.72rem;
    }
    button {
      min-height: 2.2rem;
      margin-top: 1rem;
      padding: 0.45rem 1rem;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 999px;
      color: rgba(255, 255, 255, 0.5);
      background: rgba(255, 255, 255, 0.08);
      cursor: not-allowed;
    }
    @media (max-width: 980px) {
      .dashboard-subpage {
        height: auto;
        min-height: 100svh;
        overflow: visible;
        padding: 1rem;
      }
      .settings-grid {
        grid-template-columns: 1fr;
        overflow: visible;
      }
      .profile-row,
      .setting-line {
        align-items: flex-start;
      }
    }
  `,
})
export class SettingsPage {
  private readonly auth = inject(AuthService);
  readonly userName = computed(() => this.auth.user()?.displayName.trim() || 'Aventurier');
  readonly userEmail = computed(() => this.auth.user()?.email ?? 'Email non disponible');
  readonly userInitial = computed(() => this.userName().charAt(0).toUpperCase());
}
