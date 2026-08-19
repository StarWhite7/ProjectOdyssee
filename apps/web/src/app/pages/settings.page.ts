import type { OnInit } from '@angular/core';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import {
  SettingsService,
  type GameInvitationPolicy,
  type FriendRequestPolicy,
  type ProfileVisibility,
  type SettingsProfile,
} from '../core/settings.service';
import { AmbientAudioService } from '../shared/ambient-audio.service';

type SettingsSection = 'profile' | 'account' | 'experience' | 'privacy' | 'about';

type ProfileFormValue = {
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
};

type PrivacyFormValue = {
  friendRequestPolicy: FriendRequestPolicy;
  gameInvitationPolicy: GameInvitationPolicy;
  profileVisibility: ProfileVisibility;
  searchableByPseudo: boolean;
};

const SECTION_ITEMS: Array<{
  id: SettingsSection;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    id: 'profile',
    label: 'Profil',
    description: "Vos informations visibles par vos compagnons d'aventure.",
    icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4 21a8 8 0 0 1 16 0',
  },
  {
    id: 'account',
    label: 'Compte',
    description: 'Connexion, e-mail et fournisseurs authentifiés.',
    icon: 'M12 3 20 7v5c0 5-3.2 8-8 9-4.8-1-8-4-8-9V7l8-4Z M9 12l2 2 4-5',
  },
  {
    id: 'experience',
    label: 'Expérience',
    description: "Ambiance audio et préférences d'affichage réelles.",
    icon: 'M9 18V5l12-2v13 M9 9l12-2 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  },
  {
    id: 'privacy',
    label: 'Confidentialité',
    description: 'Données, confidentialité et actions sensibles.',
    icon: 'M6 10V8a6 6 0 1 1 12 0v2 M5 10h14v10H5z M12 14v3',
  },
  {
    id: 'about',
    label: 'À propos',
    description: "Informations fiables sur l'application.",
    icon: 'M12 17v-6 M12 8h.01 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  },
];

const SETTINGS_SECTION_IMAGES: Record<SettingsSection, string> = {
  profile: '/images/settings/profil.png',
  account: '/images/settings/compte.png',
  experience: '/images/settings/experience.png',
  privacy: '/images/settings/confidentialite.png',
  about: '/images/settings/a-propos.png',
} as const;

@Component({
  selector: 'app-settings-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="settings-page" aria-labelledby="settings-title">
      <header class="settings-header">
        <div>
          <h1 id="settings-title">Paramètres</h1>
          <p>Gérez votre compte, vos préférences et personnalisez votre expérience sur Nerys.</p>
        </div>
        <button class="logout-button" type="button" [disabled]="signingOut()" (click)="signOut()">
          {{ signingOut() ? 'Déconnexion...' : 'Se déconnecter' }}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M16 17l5-5-5-5 M21 12H9 M13 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8" />
          </svg>
        </button>
      </header>

      @if (loading()) {
        <div class="settings-shell" aria-busy="true" aria-live="polite">
          <nav class="settings-nav" aria-label="Sections des paramètres">
            @for (item of sectionItems; track item.id) {
              <span class="nav-skeleton"></span>
            }
          </nav>
          <section class="settings-content">
            <article class="panel skeleton-panel"></article>
          </section>
        </div>
      } @else if (loadError()) {
        <article class="error-panel" aria-live="assertive">
          <h2>Impossible de charger vos paramètres pour le moment.</h2>
          <button type="button" (click)="retry()">Réessayer</button>
        </article>
      } @else {
        <div class="settings-shell">
          <nav class="settings-nav" aria-label="Sections des paramètres">
            @for (item of sectionItems; track item.id) {
              <button
                type="button"
                [class.active]="activeSection() === item.id"
                [attr.aria-current]="activeSection() === item.id ? 'page' : null"
                [style.--settings-bg]="settingsBackground(item.id)"
                (click)="selectSection(item.id)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path [attr.d]="item.icon" />
                </svg>
                <span>{{ item.label }}</span>
              </button>
            }
          </nav>

          <section
            class="settings-content"
            [attr.aria-labelledby]="activeSection() + '-section-title'"
          >
            @switch (activeSection()) {
              @case ('profile') {
                <article
                  class="profile-section settings-bg-card settings-bg-card--profile"
                  aria-labelledby="profile-section-title"
                  [style.--settings-bg]="settingsBackground('profile')"
                >
                  <div class="section-title">
                    <h2 id="profile-section-title">Profil</h2>
                    <p>Vos informations visibles par vos compagnons d'aventure.</p>
                  </div>

                  <form [formGroup]="profileForm" class="profile-panel" (ngSubmit)="saveProfile()">
                    <div class="profile-media">
                      <div class="avatar-frame" aria-label="Avatar du profil">
                        @if (profile()?.avatarUrl; as avatarUrl) {
                          <img [src]="avatarUrl" alt="" loading="lazy" />
                        } @else {
                          <span>{{ userInitial() }}</span>
                        }
                      </div>
                      <label class="file-action">
                        {{ uploadingAvatar() ? 'Envoi...' : "Changer l'avatar" }}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          [disabled]="uploadingAvatar()"
                          (change)="uploadImage('avatar', $event)"
                        />
                      </label>
                    </div>

                    <div class="profile-fields">
                      <div class="banner-preview">
                        @if (profile()?.bannerUrl; as bannerUrl) {
                          <img [src]="bannerUrl" alt="" loading="lazy" />
                        } @else {
                          <span>Banniere non definie</span>
                        }
                        <label class="file-action compact">
                          {{ uploadingBanner() ? 'Envoi...' : 'Changer la banniere' }}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            [disabled]="uploadingBanner()"
                            (change)="uploadImage('banner', $event)"
                          />
                        </label>
                      </div>
                      <label>
                        <span>Pseudo</span>
                        <input
                          type="text"
                          formControlName="displayName"
                          autocomplete="nickname"
                          maxlength="80"
                        />
                      </label>
                      @if (
                        profileForm.controls.displayName.invalid &&
                        profileForm.controls.displayName.touched
                      ) {
                        <p class="field-error">Le pseudo doit contenir entre 1 et 80 caractères.</p>
                      }
                      <label>
                        <span>Presentation</span>
                        <textarea formControlName="bio" maxlength="200" rows="3"></textarea>
                      </label>
                      <p class="field-note">
                        {{ profileForm.controls.bio.value.length }}/200 caracteres
                      </p>
                    </div>

                    <div class="form-actions">
                      <button
                        class="primary-button"
                        type="submit"
                        [disabled]="profileForm.invalid || !profileDirty() || savingProfile()"
                      >
                        {{ savingProfile() ? 'Enregistrement...' : 'Enregistrer' }}
                      </button>
                      <button
                        class="secondary-button"
                        type="button"
                        [disabled]="!profileDirty() || savingProfile()"
                        (click)="resetProfileForm()"
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                </article>
              }
              @case ('account') {
                <article
                  class="panel account-panel settings-bg-card settings-bg-card--account"
                  aria-labelledby="account-section-title"
                  [style.--settings-bg]="settingsBackground('account')"
                >
                  <div class="section-title">
                    <h2 id="account-section-title">Compte</h2>
                    <p>Vos informations de connexion viennent de Supabase Auth.</p>
                  </div>
                  <dl class="info-list">
                    <div>
                      <dt>Adresse e-mail actuelle</dt>
                      <dd>{{ profile()?.email || 'Non disponible' }}</dd>
                    </div>
                    @if (profile()?.emailConfirmed !== null) {
                      <div>
                        <dt>Confirmation e-mail</dt>
                        <dd>{{ profile()?.emailConfirmed ? 'Confirmée' : 'Non confirmée' }}</dd>
                      </div>
                    }
                    <div>
                      <dt>Fournisseurs connectés</dt>
                      <dd>{{ providersLabel() }}</dd>
                    </div>
                  </dl>

                  <form
                    [formGroup]="emailForm"
                    class="stack-form account-form account-email-form"
                    (ngSubmit)="saveEmail()"
                  >
                    <label>
                      <span>Nouvelle adresse e-mail</span>
                      <input type="email" formControlName="email" autocomplete="email" />
                    </label>
                    <button
                      class="secondary-button inline-action"
                      type="submit"
                      [disabled]="emailForm.invalid || !emailDirty() || savingEmail()"
                    >
                      {{ savingEmail() ? 'Envoi...' : "Changer l'e-mail" }}
                    </button>
                  </form>

                  @if (canChangePassword()) {
                    <form
                      [formGroup]="passwordForm"
                      class="stack-form account-form account-password-form"
                      (ngSubmit)="savePassword()"
                    >
                      <label>
                        <span>Nouveau mot de passe</span>
                        <input
                          type="password"
                          formControlName="password"
                          autocomplete="new-password"
                        />
                      </label>
                      <label>
                        <span>Confirmer le mot de passe</span>
                        <input
                          type="password"
                          formControlName="confirmPassword"
                          autocomplete="new-password"
                        />
                      </label>
                      <button
                        class="secondary-button inline-action"
                        type="submit"
                        [disabled]="passwordForm.invalid || savingPassword()"
                      >
                        {{ savingPassword() ? 'Enregistrement...' : 'Changer le mot de passe' }}
                      </button>
                    </form>
                  }

                  <form
                    [formGroup]="deleteAccountForm"
                    class="danger-zone"
                    (ngSubmit)="deleteAccount()"
                  >
                    <strong>Supprimer mon compte</strong>
                    <p>
                      Saisissez SUPPRIMER pour confirmer. Cette action appelle une Edge Function
                      serveur.
                    </p>
                    <input type="text" formControlName="confirmation" autocomplete="off" />
                    <button
                      class="danger-button delete-account-button"
                      type="submit"
                      [disabled]="!canDeleteAccount() || deletingAccount()"
                    >
                      {{ deletingAccount() ? 'Suppression...' : 'Supprimer mon compte' }}
                    </button>
                  </form>
                </article>
              }
              @case ('experience') {
                <article
                  class="panel settings-bg-card settings-bg-card--experience"
                  aria-labelledby="experience-section-title"
                  [style.--settings-bg]="settingsBackground('experience')"
                >
                  <div class="section-title">
                    <h2 id="experience-section-title">Expérience</h2>
                    <p>Ces réglages utilisent le même état que le lecteur audio global.</p>
                  </div>
                  <div class="setting-row">
                    <div>
                      <strong>Musique d'ambiance</strong>
                      <p>{{ audioState.playing() ? 'Lecture en cours.' : 'Lecture en pause.' }}</p>
                    </div>
                    <label class="switch">
                      <span class="sr-only">Musique d'ambiance</span>
                      <input
                        type="checkbox"
                        [checked]="audioState.preferredEnabled()"
                        (change)="setMusicPreference($event)"
                      />
                      <span aria-hidden="true"></span>
                    </label>
                  </div>
                  <label class="volume-row">
                    <span>Volume</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      [value]="audioState.volumePercent()"
                      [style.--volume]="audioState.volumePercent() + '%'"
                      [attr.aria-valuetext]="audioState.volumePercent() + ' %'"
                      (input)="setVolume($event)"
                    />
                    <output>{{ audioState.volumePercent() }}%</output>
                  </label>
                  <div class="setting-row muted-row">
                    <div>
                      <strong>Animations</strong>
                      <p>
                        Les animations respectent automatiquement la préférence système de mouvement
                        réduit.
                      </p>
                    </div>
                    <span class="status-pill">Système</span>
                  </div>
                </article>
              }
              @case ('privacy') {
                <article
                  class="panel settings-bg-card settings-bg-card--privacy"
                  aria-labelledby="privacy-section-title"
                  [style.--settings-bg]="settingsBackground('privacy')"
                >
                  <div class="section-title">
                    <h2 id="privacy-section-title">Confidentialité</h2>
                    <p>
                      Ces réglages sont persistés et appliqués côté serveur par les RPC sociales.
                    </p>
                  </div>
                  <form
                    [formGroup]="privacyForm"
                    class="privacy-form"
                    (ngSubmit)="savePreferences()"
                  >
                    <label>
                      <span>Demandes d'amis</span>
                      <select formControlName="friendRequestPolicy">
                        <option value="everyone">Tout le monde</option>
                        <option value="nobody">Personne</option>
                      </select>
                    </label>
                    <label>
                      <span>Invitations d'aventure</span>
                      <select formControlName="gameInvitationPolicy">
                        <option value="friends">Amis uniquement</option>
                        <option value="nobody">Personne</option>
                      </select>
                    </label>
                    <label>
                      <span>Visibilité du profil</span>
                      <select formControlName="profileVisibility">
                        <option value="public">Publique</option>
                        <option value="friends">Amis uniquement</option>
                      </select>
                    </label>
                    <label class="check-row">
                      <input type="checkbox" formControlName="searchableByPseudo" />
                      <span>Autoriser les autres joueurs à me trouver par pseudo</span>
                    </label>
                    <div class="form-actions horizontal">
                      <button
                        class="primary-button"
                        type="submit"
                        [disabled]="!privacyDirty() || savingPreferences()"
                      >
                        {{ savingPreferences() ? 'Enregistrement...' : 'Enregistrer' }}
                      </button>
                      <button
                        class="secondary-button"
                        type="button"
                        [disabled]="!privacyDirty() || savingPreferences()"
                        (click)="resetPrivacyForm()"
                      >
                        Annuler
                      </button>
                    </div>
                  </form>

                  <section class="blocked-section" aria-label="Utilisateurs bloqués">
                    <h3>Utilisateurs bloqués</h3>
                    @if (profile()?.blockedUsers?.length) {
                      <div class="blocked-list">
                        @for (blocked of profile()?.blockedUsers ?? []; track blocked.userId) {
                          <article class="blocked-user">
                            <span class="small-avatar" aria-hidden="true">
                              @if (blocked.avatarUrl) {
                                <img [src]="blocked.avatarUrl" alt="" loading="lazy" />
                              } @else {
                                {{ blocked.displayName.charAt(0).toLocaleUpperCase('fr-FR') }}
                              }
                            </span>
                            <strong>{{ blocked.displayName }}</strong>
                            <button
                              class="secondary-button"
                              type="button"
                              [disabled]="unblockingUserId() === blocked.userId"
                              (click)="unblockUser(blocked.userId)"
                            >
                              {{
                                unblockingUserId() === blocked.userId ? 'Déblocage...' : 'Débloquer'
                              }}
                            </button>
                          </article>
                        }
                      </div>
                    } @else {
                      <p class="field-note">Aucun utilisateur bloqué.</p>
                    }
                  </section>
                </article>
              }
              @case ('about') {
                <article
                  class="panel settings-bg-card settings-bg-card--about"
                  aria-labelledby="about-section-title"
                  [style.--settings-bg]="settingsBackground('about')"
                >
                  <div class="about-content">
                    <div class="about-main-card">
                      <div class="section-title">
                        <h2 id="about-section-title">À propos de Nerys</h2>
                        <p>Informations sur l'application et les liens utiles.</p>
                      </div>
                      <dl class="info-list">
                        <div>
                          <dt>Application</dt>
                          <dd>Nerys</dd>
                        </div>
                        <div>
                          <dt>Version</dt>
                          <dd>{{ profile()?.appVersion }}</dd>
                        </div>
                      </dl>
                    </div>
                    <nav class="about-links-card" aria-label="Liens utiles et légaux">
                      <div class="links-row about-links">
                        <a routerLink="/conditions-utilisation">Conditions d'utilisation</a>
                        <a routerLink="/confidentialite">Politique de confidentialité</a>
                      </div>
                    </nav>
                  </div>
                </article>
              }
            }

            @if (statusMessage()) {
              <p class="status-message" [class.error]="statusIsError()" aria-live="polite">
                {{ statusMessage() }}
              </p>
            }
          </section>
        </div>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      min-height: 0;
    }
    .settings-page {
      height: 100%;
      min-height: 0;
      padding: clamp(1.15rem, 2.5vh, 2.25rem) clamp(1.7rem, 3.2vw, 3.4rem)
        clamp(0.95rem, 1.9vh, 1.7rem);
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      gap: clamp(0.9rem, 1.8vh, 1.45rem);
      overflow: hidden;
      color: #172448;
    }
    .settings-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 1rem;
    }
    h1 {
      margin: 0;
      color: #172448;
      font:
        600 clamp(2.25rem, 3.25vw, 3.85rem) / 0.95 'Newsreader',
        serif;
      letter-spacing: 0;
    }
    .settings-header p,
    .section-title p {
      max-width: 38rem;
      margin: clamp(0.45rem, 0.9vh, 0.75rem) 0 0;
      color: rgba(23, 36, 72, 0.84);
      font-size: clamp(0.92rem, 1.05vw, 1.12rem);
      line-height: 1.45;
    }
    .logout-button,
    .primary-button,
    .secondary-button,
    .danger-button,
    .settings-nav button {
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 0.7rem;
      color: #172448;
      background: rgba(255, 255, 255, 0.22);
      backdrop-filter: blur(12px);
      font: inherit;
      font-weight: 800;
    }
    .logout-button {
      min-height: 2.55rem;
      padding: 0.5rem 1.1rem;
      display: inline-flex;
      align-items: center;
      gap: 0.8rem;
      color: white;
      background: rgba(27, 36, 76, 0.28);
      white-space: nowrap;
    }
    svg {
      width: 1rem;
      height: 1rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .settings-shell {
      min-height: 0;
      display: grid;
      grid-template-columns: minmax(10.5rem, 15rem) minmax(0, 1fr);
      gap: clamp(1.2rem, 2.5vw, 2.2rem);
      overflow: hidden;
    }
    .settings-nav {
      min-height: 0;
      padding-right: clamp(0.8rem, 1.7vw, 1.7rem);
      border-right: 1px solid rgba(23, 36, 72, 0.18);
      display: grid;
      align-content: start;
      gap: clamp(0.5rem, 1vh, 0.75rem);
    }
    .settings-nav button {
      min-height: clamp(2.75rem, 5.2vh, 3.5rem);
      padding: 0 1rem;
      display: grid;
      grid-template-columns: 1.25rem minmax(0, 1fr);
      align-items: center;
      gap: 0.85rem;
      text-align: left;
      background-color: rgba(255, 255, 255, 0.16);
      background-image:
        linear-gradient(90deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.16)),
        var(--settings-bg);
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      border-color: rgba(255, 255, 255, 0.14);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
    }
    .settings-nav button.active {
      color: #352c92;
      background-color: rgba(255, 255, 255, 0.2);
      background-image:
        linear-gradient(90deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.2)),
        var(--settings-bg);
      border-color: rgba(255, 255, 255, 0.72);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.28),
        0 0 0 1px rgba(255, 255, 255, 0.22);
    }
    .settings-nav button span {
      width: fit-content;
      max-width: 100%;
      padding: 0.12rem 0.28rem;
      border-radius: 0.35rem;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
    }
    .settings-content {
      min-height: 0;
      display: grid;
      grid-template-rows: minmax(0, auto) auto auto;
      align-content: start;
      gap: clamp(0.85rem, 1.6vh, 1.25rem);
      overflow: hidden;
    }
    .section-title h2,
    .panel h2,
    .error-panel h2 {
      margin: 0;
      color: #172448;
      font:
        600 clamp(1.15rem, 1.5vw, 1.55rem) / 1.05 'Newsreader',
        serif;
      letter-spacing: 0;
    }
    .profile-section,
    .profile-panel,
    .panel,
    .error-panel {
      margin-top: clamp(0.75rem, 1.4vh, 1.15rem);
      padding: clamp(1rem, 2vh, 1.55rem);
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 0.85rem;
      background: rgba(255, 255, 255, 0.28);
      box-shadow: 0 18px 45px rgba(15, 23, 56, 0.12);
      backdrop-filter: blur(14px);
    }
    .settings-bg-card {
      overflow: hidden;
      background-color: transparent;
      background-image: var(--settings-bg);
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      backdrop-filter: none;
    }
    .settings-bg-card--profile {
      background-position: center right;
    }
    .settings-bg-card--account {
      background-position: center;
    }
    .settings-bg-card--experience {
      background-position: center;
    }
    .settings-bg-card--privacy {
      background-position: center;
    }
    .settings-bg-card--about {
      background-position: center;
    }
    .settings-bg-card--about {
      display: block;
    }
    .about-content {
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: clamp(0.75rem, 1.2vh, 1rem);
    }
    .about-main-card,
    .about-links-card {
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 0.8rem;
      background: rgba(245, 248, 255, 0.26);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
      box-shadow: 0 12px 32px rgba(15, 23, 56, 0.1);
    }
    .about-main-card {
      padding: clamp(0.8rem, 1.2vh, 1.1rem);
      display: grid;
      gap: clamp(0.65rem, 1vh, 0.85rem);
    }
    .about-links-card {
      flex: 0 0 auto;
      padding: clamp(0.55rem, 0.8vh, 0.75rem);
    }
    .settings-bg-card.settings-bg-card--about .section-title,
    .settings-bg-card.settings-bg-card--about .info-list,
    .settings-bg-card.settings-bg-card--about .links-row {
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }
    .settings-bg-card.settings-bg-card--about .info-list {
      gap: clamp(0.45rem, 0.8vh, 0.65rem);
    }
    .settings-bg-card.settings-bg-card--about .info-list div {
      min-height: 0;
      padding: clamp(0.35rem, 0.7vh, 0.55rem) 0;
    }
    .about-links {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: clamp(0.75rem, 1.4vw, 1rem);
    }
    .settings-bg-card .section-title,
    .settings-bg-card .info-list,
    .settings-bg-card .stack-form,
    .settings-bg-card .privacy-form,
    .settings-bg-card .danger-zone,
    .settings-bg-card .setting-row,
    .settings-bg-card .volume-row,
    .settings-bg-card .links-row,
    .settings-bg-card .blocked-section {
      padding: clamp(0.65rem, 1.25vh, 0.95rem);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 0.75rem;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
    }
    .settings-bg-card--privacy .section-title,
    .settings-bg-card--privacy .privacy-form,
    .settings-bg-card--privacy .blocked-section {
      background: rgba(8, 13, 28, 0.18);
    }
    .settings-bg-card--privacy,
    .settings-bg-card--privacy .section-title h2,
    .settings-bg-card--privacy .section-title p,
    .settings-bg-card--privacy .privacy-form label,
    .settings-bg-card--privacy .privacy-form span,
    .settings-bg-card--privacy .privacy-form strong,
    .settings-bg-card--privacy .privacy-form select,
    .settings-bg-card--privacy .privacy-form option,
    .settings-bg-card--privacy .check-row,
    .settings-bg-card--privacy .blocked-section h3,
    .settings-bg-card--privacy .blocked-section p,
    .settings-bg-card--privacy .field-note {
      color: white;
    }
    .settings-bg-card--privacy .privacy-form select {
      background: rgba(8, 13, 28, 0.34);
    }
    .settings-bg-card--privacy .privacy-form option {
      background: #11182e;
    }
    .settings-bg-card .setting-row,
    .settings-bg-card .volume-row {
      margin-top: 0.75rem;
    }
    .settings-bg-card .section-title p {
      max-width: 34rem;
    }
    .profile-panel {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: clamp(1rem, 2.2vw, 2rem);
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
    }
    .profile-media {
      display: grid;
      gap: 0.7rem;
      justify-items: center;
    }
    .avatar-frame {
      width: clamp(5rem, 8vw, 7rem);
      aspect-ratio: 1;
      border: 2px solid rgba(255, 255, 255, 0.78);
      border-radius: 50%;
      display: grid;
      place-items: center;
      overflow: hidden;
      color: white;
      background: linear-gradient(145deg, #26355f, #8e7b68);
      box-shadow: 0 12px 30px rgba(18, 28, 60, 0.18);
      font:
        600 clamp(1.6rem, 3vw, 2.5rem) 'Newsreader',
        serif;
    }
    .avatar-frame img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .profile-fields {
      min-width: 0;
      display: grid;
      gap: 0.55rem;
    }
    .banner-preview {
      width: 100%;
      height: clamp(6rem, 14vh, 8rem);
      min-height: 6rem;
      max-height: 8rem;
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 0.75rem;
      display: grid;
      align-items: center;
      position: relative;
      overflow: hidden;
      background: rgba(23, 36, 72, 0.12);
    }
    .banner-preview img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      display: block;
    }
    .banner-preview > span {
      position: relative;
      z-index: 1;
      padding-left: 0.9rem;
      color: rgba(23, 36, 72, 0.72);
      font-weight: 800;
    }
    .banner-preview .file-action {
      position: absolute;
      top: 0.7rem;
      right: 0.7rem;
      z-index: 2;
    }
    label {
      display: grid;
      gap: 0.45rem;
      color: #172448;
      font-weight: 800;
    }
    input[type='text'],
    input[type='email'],
    input[type='password'],
    textarea,
    select {
      width: 100%;
      min-height: 2.65rem;
      padding: 0 0.9rem;
      border: 1px solid rgba(23, 36, 72, 0.12);
      border-radius: 0.65rem;
      color: #172448;
      background: rgba(255, 255, 255, 0.26);
      font: inherit;
    }
    textarea {
      min-height: 4.8rem;
      padding-block: 0.75rem;
      resize: none;
    }
    .file-action {
      min-height: 2.1rem;
      padding: 0.42rem 0.85rem;
      border: 1px solid rgba(255, 255, 255, 0.24);
      border-radius: 999px;
      display: inline-grid;
      place-items: center;
      color: #172448;
      background: rgba(255, 255, 255, 0.24);
      cursor: pointer;
      font-size: 0.82rem;
      font-weight: 800;
    }
    .file-action input {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }
    .file-action.compact {
      white-space: nowrap;
    }
    .field-note,
    .field-error {
      margin: 0;
      color: rgba(23, 36, 72, 0.74);
      font-size: 0.82rem;
      line-height: 1.35;
    }
    .field-error {
      color: #8a2438;
    }
    .form-actions {
      display: grid;
      gap: 0.6rem;
      min-width: 9.6rem;
    }
    .form-actions.horizontal {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      flex-wrap: wrap;
    }
    .stack-form,
    .privacy-form,
    .danger-zone {
      margin-top: 1rem;
      display: grid;
      gap: 0.75rem;
    }
    .privacy-form {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .check-row {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-weight: 800;
    }
    .check-row input {
      width: 1rem;
      height: 1rem;
      accent-color: #6557d2;
    }
    .danger-zone {
      padding-top: 1rem;
      border-top: 1px solid rgba(109, 26, 46, 0.18);
    }
    .primary-button,
    .secondary-button,
    .danger-button {
      min-height: 2.45rem;
      padding: 0.52rem 1rem;
      border-radius: 999px;
    }
    .primary-button {
      color: white;
      background: linear-gradient(120deg, #7364df, #5145bd);
      border: 0;
      box-shadow: 0 10px 24px rgba(45, 42, 126, 0.22);
    }
    .secondary-button {
      background: rgba(255, 255, 255, 0.2);
    }
    .danger-button {
      color: rgba(109, 26, 46, 0.56);
      border-color: rgba(109, 26, 46, 0.18);
      background: rgba(255, 255, 255, 0.16);
    }
    .delete-account-button:not(:disabled) {
      color: white;
      border-color: rgba(201, 60, 74, 0.7);
      background: #c93c4a;
      cursor: pointer;
    }
    .delete-account-button:not(:disabled):hover {
      background: #b73240;
    }
    .inline-action {
      margin-top: 1rem;
    }
    .link-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
    }
    .info-list {
      margin: 0;
      display: grid;
      gap: 0.8rem;
    }
    .info-list div,
    .setting-row {
      min-height: 3.65rem;
      padding: 0.8rem 0;
      border-bottom: 1px solid rgba(23, 36, 72, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .info-list div:last-child,
    .setting-row:last-child {
      border-bottom: 0;
    }
    dt {
      color: rgba(23, 36, 72, 0.66);
      font-size: 0.76rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    dd,
    .setting-row p,
    .setting-row strong {
      margin: 0;
    }
    dd,
    .setting-row strong {
      color: #172448;
    }
    .setting-row p {
      margin-top: 0.25rem;
      color: rgba(23, 36, 72, 0.74);
      line-height: 1.4;
    }
    .switch {
      flex: 0 0 auto;
    }
    .switch input {
      position: absolute;
      opacity: 0;
    }
    .switch span {
      width: 3rem;
      height: 1.65rem;
      padding: 0.18rem;
      border-radius: 999px;
      display: block;
      background: rgba(23, 36, 72, 0.24);
    }
    .switch span::before {
      content: '';
      width: 1.28rem;
      aspect-ratio: 1;
      border-radius: 50%;
      display: block;
      background: white;
      box-shadow: 0 2px 8px rgba(15, 23, 56, 0.2);
      transition: transform 0.2s ease;
    }
    .switch input:checked + span {
      background: #6557d2;
    }
    .switch input:checked + span::before {
      transform: translateX(1.35rem);
    }
    .volume-row {
      grid-template-columns: auto minmax(0, 1fr) auto;
      display: grid;
      align-items: center;
      gap: 0.8rem;
      padding: 0.85rem 0;
    }
    input[type='range'] {
      width: 100%;
      height: 4px;
      border: 0;
      border-radius: 999px;
      appearance: none;
      background: linear-gradient(
        90deg,
        #6557d2 0 var(--volume),
        rgba(23, 36, 72, 0.18) var(--volume) 100%
      );
    }
    input[type='range']::-webkit-slider-thumb {
      width: 0.9rem;
      height: 0.9rem;
      border: 2px solid white;
      border-radius: 50%;
      appearance: none;
      background: #6557d2;
      box-shadow: 0 2px 8px rgba(19, 24, 66, 0.3);
    }
    output {
      min-width: 2.4rem;
      color: #172448;
      font-variant-numeric: tabular-nums;
      font-weight: 800;
      text-align: right;
    }
    .status-pill {
      padding: 0.32rem 0.7rem;
      border-radius: 999px;
      color: #443aa8;
      background: rgba(101, 87, 210, 0.14);
      font-weight: 800;
    }
    .links-row {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }
    .links-row a {
      color: #443aa8;
      font-weight: 800;
    }
    .blocked-section {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(23, 36, 72, 0.1);
    }
    .blocked-section h3 {
      margin: 0 0 0.65rem;
      color: #172448;
      font:
        600 1.05rem / 1.1 'Newsreader',
        serif;
    }
    .blocked-list {
      display: grid;
      gap: 0.55rem;
    }
    .blocked-user {
      min-height: 3.1rem;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.75rem;
    }
    .small-avatar {
      width: 2.1rem;
      aspect-ratio: 1;
      border-radius: 50%;
      display: grid;
      place-items: center;
      overflow: hidden;
      color: white;
      background: rgba(23, 36, 72, 0.35);
      font-weight: 800;
    }
    .small-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .status-message {
      margin: 0;
      padding: 0.65rem 0.85rem;
      border: 1px solid rgba(42, 98, 62, 0.16);
      border-radius: 0.7rem;
      color: #163f28;
      background: rgba(222, 246, 227, 0.44);
    }
    .status-message.error {
      color: #802239;
      background: rgba(255, 228, 232, 0.5);
    }
    .error-panel {
      align-self: start;
      max-width: 42rem;
    }
    .error-panel button {
      margin-top: 1rem;
    }
    .nav-skeleton,
    .skeleton-panel {
      min-height: 3rem;
      border-radius: 0.8rem;
      background: rgba(255, 255, 255, 0.18);
    }
    .skeleton-panel {
      min-height: clamp(9rem, 24vh, 13rem);
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
    button:not(:disabled):hover {
      filter: brightness(1.06);
    }
    button:focus-visible,
    a:focus-visible,
    input:focus-visible {
      outline: 3px solid rgba(255, 255, 255, 0.9);
      outline-offset: 3px;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
    @media (max-height: 900px) and (min-width: 981px) {
      .settings-page {
        padding-block: 1rem 0.8rem;
        gap: 0.8rem;
      }
      .settings-header p,
      .section-title p {
        margin-top: 0.35rem;
        line-height: 1.32;
      }
      .profile-panel,
      .profile-section,
      .panel {
        padding: 1rem;
      }
    }
    @media (max-height: 800px) and (min-width: 981px) {
      h1 {
        font-size: clamp(1.95rem, 2.7vw, 3rem);
      }
      .settings-header p {
        font-size: 0.92rem;
      }
      .settings-nav button {
        min-height: 2.55rem;
      }
      .avatar-frame {
        width: 4.8rem;
      }
      .profile-panel {
        gap: 0.9rem;
      }
      .field-note,
      .setting-row p {
        display: none;
      }
    }
    @media (max-height: 720px) and (min-width: 981px) {
      .settings-page {
        padding-block: 0.75rem 0.6rem;
      }
      .settings-header p,
      .section-title p {
        display: none;
      }
      .settings-content {
        gap: 0.6rem;
      }
      .profile-panel,
      .panel {
        margin-top: 0.55rem;
      }
    }
    @media (max-width: 980px) {
      .settings-page {
        height: auto;
        min-height: 100svh;
        padding: 1rem;
        overflow: visible;
      }
      .settings-header {
        flex-direction: column;
      }
      .settings-shell,
      .profile-panel,
      .privacy-form {
        grid-template-columns: 1fr;
      }
      .settings-shell,
      .settings-content {
        overflow: visible;
      }
      .settings-nav {
        padding: 0;
        border-right: 0;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .form-actions {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .volume-row {
        grid-template-columns: 1fr;
      }
      .info-list div,
      .setting-row {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `,
})
export class SettingsPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly settings = inject(SettingsService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly audioState = inject(AmbientAudioService);
  protected readonly sectionItems = SECTION_ITEMS;
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly profile = signal<SettingsProfile | null>(null);
  readonly activeSection = signal<SettingsSection>('profile');
  readonly savingProfile = signal(false);
  readonly savingEmail = signal(false);
  readonly savingPassword = signal(false);
  readonly savingPreferences = signal(false);
  readonly uploadingAvatar = signal(false);
  readonly uploadingBanner = signal(false);
  readonly deletingAccount = signal(false);
  readonly unblockingUserId = signal<string | null>(null);
  readonly signingOut = signal(false);
  readonly statusMessage = signal('');
  readonly statusIsError = signal(false);
  readonly profileForm = this.formBuilder.nonNullable.group({
    displayName: ['', [Validators.required, Validators.maxLength(80)]],
    bio: ['', [Validators.maxLength(200)]],
  });
  readonly emailForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });
  readonly passwordForm = this.formBuilder.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });
  readonly privacyForm = this.formBuilder.nonNullable.group({
    friendRequestPolicy: ['everyone' as FriendRequestPolicy],
    gameInvitationPolicy: ['friends' as GameInvitationPolicy],
    profileVisibility: ['public' as ProfileVisibility],
    searchableByPseudo: [true],
  });
  readonly deleteAccountForm = this.formBuilder.nonNullable.group({
    confirmation: [''],
  });
  readonly initialProfile = signal<ProfileFormValue | null>(null);
  readonly initialEmail = signal('');
  readonly initialPrivacy = signal<PrivacyFormValue | null>(null);
  readonly profileDraftVersion = signal(0);
  readonly emailDraftVersion = signal(0);
  readonly privacyDraftVersion = signal(0);
  readonly deleteAccountDraftVersion = signal(0);
  readonly userInitial = computed(
    () => this.profile()?.displayName.trim().charAt(0).toLocaleUpperCase('fr-FR') || '?',
  );
  readonly providersLabel = computed(() => {
    const providers = this.profile()?.providers ?? [];
    return providers.length
      ? providers.map((provider) => this.providerLabel(provider)).join(', ')
      : 'Non disponible';
  });
  readonly canChangePassword = computed(() => {
    const profile = this.profile();
    if (!profile?.email) return false;
    return !profile.providers.length || profile.providers.includes('email');
  });
  readonly profileDirty = computed(() => {
    this.profileDraftVersion();
    const initial = this.initialProfile();
    if (!initial) return false;
    return !this.sameProfileValue(initial, this.currentProfileValue());
  });
  readonly emailDirty = computed(() => {
    this.emailDraftVersion();
    return this.emailForm.controls.email.value.trim() !== this.initialEmail();
  });
  readonly privacyDirty = computed(() => {
    this.privacyDraftVersion();
    const initial = this.initialPrivacy();
    if (!initial) return false;
    return !this.samePrivacyValue(initial, this.currentPrivacyValue());
  });
  readonly canDeleteAccount = computed(() => {
    this.deleteAccountDraftVersion();
    return this.deleteAccountForm.controls.confirmation.value.trim() === 'SUPPRIMER';
  });

  constructor() {
    this.profileForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.profileDraftVersion.update((version) => version + 1);
    });
    this.emailForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.emailDraftVersion.update((version) => version + 1);
    });
    this.privacyForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.privacyDraftVersion.update((version) => version + 1);
    });
    this.deleteAccountForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.deleteAccountDraftVersion.update((version) => version + 1);
    });
  }

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async retry(): Promise<void> {
    await this.load();
  }

  selectSection(section: SettingsSection): void {
    this.activeSection.set(section);
    this.clearStatus();
  }

  settingsBackground(section: SettingsSection): string {
    return `url(${SETTINGS_SECTION_IMAGES[section]})`;
  }

  resetProfileForm(): void {
    const initial = this.initialProfile();
    this.profileForm.reset({ displayName: initial?.displayName ?? '', bio: initial?.bio ?? '' });
    this.profileForm.markAsPristine();
    this.profileForm.markAsUntouched();
    this.profileDraftVersion.update((version) => version + 1);
    this.clearStatus();
  }

  async saveProfile(): Promise<void> {
    if (this.profileForm.invalid || !this.profileDirty() || this.savingProfile()) return;
    this.savingProfile.set(true);
    this.clearStatus();
    try {
      const updated = await this.settings.updateProfile({
        displayName: this.profileForm.controls.displayName.value,
        bio: this.profileForm.controls.bio.value,
      });
      this.profile.set(updated);
      this.applyProfileSnapshot(updated);
      this.showStatus('Profil mis à jour.');
    } catch {
      this.showStatus("Impossible d'enregistrer les modifications.", true);
    } finally {
      this.savingProfile.set(false);
    }
  }

  async uploadImage(kind: 'avatar' | 'banner', event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const loading = kind === 'avatar' ? this.uploadingAvatar : this.uploadingBanner;
    if (loading()) return;
    loading.set(true);
    this.clearStatus();
    try {
      const updated = await this.settings.uploadProfileImage(kind, file);
      this.profile.set(updated);
      this.applyProfileSnapshot(updated);
      this.showStatus(kind === 'avatar' ? 'Avatar mis a jour.' : 'Banniere mise a jour.');
    } catch {
      this.showStatus("Impossible d'envoyer cette image.", true);
    } finally {
      loading.set(false);
    }
  }

  async saveEmail(): Promise<void> {
    if (this.emailForm.invalid || !this.emailDirty() || this.savingEmail()) return;
    this.savingEmail.set(true);
    this.clearStatus();
    try {
      await this.settings.updateEmail(this.emailForm.controls.email.value);
      this.initialEmail.set(this.emailForm.controls.email.value.trim());
      this.emailForm.markAsPristine();
      this.showStatus('Un e-mail de confirmation a ete envoye si Supabase le requiert.');
    } catch {
      this.showStatus("Impossible de modifier l'adresse e-mail.", true);
    } finally {
      this.savingEmail.set(false);
    }
  }

  async savePassword(): Promise<void> {
    if (this.passwordForm.invalid || this.savingPassword()) return;
    const { password, confirmPassword } = this.passwordForm.getRawValue();
    if (password !== confirmPassword) {
      this.showStatus('Les mots de passe ne correspondent pas.', true);
      return;
    }
    this.savingPassword.set(true);
    this.clearStatus();
    try {
      await this.settings.updatePassword(password);
      this.passwordForm.reset({ password: '', confirmPassword: '' });
      this.passwordForm.markAsPristine();
      this.showStatus('Mot de passe mis a jour.');
    } catch {
      this.showStatus('Impossible de modifier le mot de passe.', true);
    } finally {
      this.savingPassword.set(false);
    }
  }

  resetPrivacyForm(): void {
    const initial = this.initialPrivacy();
    if (!initial) return;
    this.privacyForm.reset(initial);
    this.privacyForm.markAsPristine();
    this.privacyForm.markAsUntouched();
    this.privacyDraftVersion.update((version) => version + 1);
    this.clearStatus();
  }

  async savePreferences(): Promise<void> {
    if (!this.privacyDirty() || this.savingPreferences()) return;
    this.savingPreferences.set(true);
    this.clearStatus();
    try {
      const updated = await this.settings.updatePreferences(this.currentPrivacyValue());
      this.profile.set(updated);
      this.applyPrivacySnapshot(updated);
      this.showStatus('Preferences de confidentialite enregistrees.');
    } catch {
      this.showStatus("Impossible d'enregistrer les preferences.", true);
    } finally {
      this.savingPreferences.set(false);
    }
  }

  async unblockUser(userId: string): Promise<void> {
    if (this.unblockingUserId()) return;
    this.unblockingUserId.set(userId);
    this.clearStatus();
    try {
      const updated = await this.settings.unblockUser(userId);
      this.profile.set(updated);
      this.applyPrivacySnapshot(updated);
      this.showStatus('Utilisateur debloque.');
    } catch {
      this.showStatus('Impossible de debloquer cet utilisateur.', true);
    } finally {
      this.unblockingUserId.set(null);
    }
  }

  async deleteAccount(): Promise<void> {
    if (this.deletingAccount() || !this.canDeleteAccount()) return;
    const confirmation = this.deleteAccountForm.controls.confirmation.value.trim();
    this.deletingAccount.set(true);
    this.clearStatus();
    try {
      await this.settings.deleteAccount(confirmation);
      await this.auth.signOut();
      await this.router.navigateByUrl('/');
    } catch {
      this.showStatus('Suppression du compte impossible pour le moment.', true);
      this.deletingAccount.set(false);
    }
  }

  setMusicPreference(event: Event): void {
    const enabled = (event.target as HTMLInputElement).checked;
    this.audioState.setPreferredEnabled(enabled);
  }

  setVolume(event: Event): void {
    this.audioState.setVolumePercent(Number((event.target as HTMLInputElement).value));
  }

  async signOut(): Promise<void> {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.clearStatus();
    try {
      await this.auth.signOut();
      await this.router.navigateByUrl('/');
    } catch {
      this.showStatus('Déconnexion impossible pour le moment.', true);
    } finally {
      this.signingOut.set(false);
    }
  }

  private applyProfileSnapshot(profile: SettingsProfile | null): void {
    const snapshot = this.toProfileValue(profile);
    this.initialProfile.set(snapshot);
    this.profileForm.reset({
      displayName: snapshot?.displayName ?? '',
      bio: snapshot?.bio ?? '',
    });
    this.profileForm.markAsPristine();
    this.profileForm.markAsUntouched();
    this.profileDraftVersion.update((version) => version + 1);
  }

  private applyPrivacySnapshot(profile: SettingsProfile | null): void {
    const snapshot = this.toPrivacyValue(profile);
    this.initialPrivacy.set(snapshot);
    if (snapshot) {
      this.privacyForm.reset(snapshot);
    }
    this.privacyForm.markAsPristine();
    this.privacyForm.markAsUntouched();
    this.privacyDraftVersion.update((version) => version + 1);
  }

  private currentProfileValue(): ProfileFormValue {
    const profile = this.profile();
    return {
      displayName: this.profileForm.controls.displayName.value.trim(),
      bio: this.profileForm.controls.bio.value.trim(),
      avatarUrl: profile?.avatarUrl ?? null,
      bannerUrl: profile?.bannerUrl ?? null,
    };
  }

  private currentPrivacyValue(): PrivacyFormValue {
    const value = this.privacyForm.getRawValue();
    return {
      friendRequestPolicy: value.friendRequestPolicy,
      gameInvitationPolicy: value.gameInvitationPolicy,
      profileVisibility: value.profileVisibility,
      searchableByPseudo: value.searchableByPseudo,
    };
  }

  private toProfileValue(profile: SettingsProfile | null): ProfileFormValue | null {
    if (!profile) return null;
    return {
      displayName: profile.displayName.trim(),
      bio: profile.bio.trim(),
      avatarUrl: profile.avatarUrl,
      bannerUrl: profile.bannerUrl,
    };
  }

  private toPrivacyValue(profile: SettingsProfile | null): PrivacyFormValue | null {
    if (!profile) return null;
    return { ...profile.preferences };
  }

  private sameProfileValue(left: ProfileFormValue, right: ProfileFormValue): boolean {
    return (
      left.displayName === right.displayName &&
      left.bio === right.bio &&
      left.avatarUrl === right.avatarUrl &&
      left.bannerUrl === right.bannerUrl
    );
  }

  private samePrivacyValue(left: PrivacyFormValue, right: PrivacyFormValue): boolean {
    return (
      left.friendRequestPolicy === right.friendRequestPolicy &&
      left.gameInvitationPolicy === right.gameInvitationPolicy &&
      left.profileVisibility === right.profileVisibility &&
      left.searchableByPseudo === right.searchableByPseudo
    );
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    this.clearStatus();
    try {
      const profile = await this.settings.load();
      this.profile.set(profile);
      this.applyProfileSnapshot(profile);
      this.emailForm.reset({ email: profile?.email ?? '' });
      this.initialEmail.set(profile?.email ?? '');
      this.emailForm.markAsPristine();
      this.emailForm.markAsUntouched();
      this.emailDraftVersion.update((version) => version + 1);
      this.passwordForm.reset({ password: '', confirmPassword: '' });
      this.passwordForm.markAsPristine();
      this.passwordForm.markAsUntouched();
      this.applyPrivacySnapshot(profile);
      this.deleteAccountForm.reset({ confirmation: '' });
      this.deleteAccountForm.markAsPristine();
      this.deleteAccountForm.markAsUntouched();
      this.deleteAccountDraftVersion.update((version) => version + 1);
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  private providerLabel(provider: string): string {
    switch (provider) {
      case 'email':
        return 'E-mail';
      case 'google':
        return 'Google';
      case 'discord':
        return 'Discord';
      default:
        return provider;
    }
  }

  private clearStatus(): void {
    this.statusMessage.set('');
    this.statusIsError.set(false);
  }

  private showStatus(message: string, error = false): void {
    this.statusMessage.set(message);
    this.statusIsError.set(error);
  }
}
