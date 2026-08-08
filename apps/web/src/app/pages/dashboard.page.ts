import { DOCUMENT } from '@angular/common';
import type { OnDestroy, OnInit } from '@angular/core';
import { Component, computed, inject, input, isDevMode, output, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { GameService } from '../core/game.service';
import type { GameSummary } from '../core/game.service';
import type { DashboardNotificationState } from '../shared/dashboard-notification';
import {
  DASHBOARD_NOTIFICATION_MESSAGES,
  DELETION_NOTICE_DURATION_MS,
} from '../shared/dashboard-notification';
import { OdysseeBrandComponent } from '../shared/odyssee-brand.component';

type DashboardAdventureView = {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  chapterLabel: string;
  activityLabel: string;
  modeLabel: string;
  image: string;
  icon: 'compass' | 'tree' | 'spiral';
  routeSection: 'salon' | 'personnage' | 'jouer';
  updatedAtTime: number;
};

const DASHBOARD_IMAGES = {
  current: '/images/dashboard/AventureEnCours.png',
  create: '/images/dashboard/NouvelleAventure.png',
  recent1: '/images/dashboard/DernierAventure.png',
  recent2: '/images/dashboard/DernierAventure.png',
  recent3: '/images/dashboard/DernierAventure.png',
} as const;

@Component({
  selector: 'app-dashboard-sidebar',
  imports: [RouterLink, RouterLinkActive, OdysseeBrandComponent],
  template: `
    <aside class="dashboard-sidebar" aria-label="Navigation du tableau de bord">
      <div class="sidebar-brand">
        <app-odyssee-brand />
      </div>

      <nav class="sidebar-nav" aria-label="Sections">
        @for (item of navItems; track item.label) {
          <a
            class="nav-item"
            [routerLink]="item.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            ariaCurrentWhenActive="page"
          >
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path [attr.d]="item.icon" />
              </svg>
            </span>
            <span class="nav-label">{{ item.label }}</span>
          </a>
        }
      </nav>

      <div class="sidebar-audio-space" aria-hidden="true"></div>
    </aside>
  `,
  styles: `
    :host {
      min-height: 0;
    }
    .dashboard-sidebar {
      position: relative;
      height: 100%;
      min-height: 0;
      padding: clamp(1.25rem, 3vh, 2.4rem) clamp(1.15rem, 1.9vw, 1.9rem);
      display: flex;
      flex-direction: column;
      gap: clamp(1rem, 2.4vh, 2rem);
      color: rgba(255, 255, 255, 0.9);
      background:
        linear-gradient(180deg, rgba(33, 43, 88, 0.64), rgba(13, 22, 55, 0.46)),
        rgba(11, 18, 46, 0.42);
      border-right: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(15px);
    }
    .sidebar-brand {
      width: 100%;
      display: flex;
      justify-content: center;
      color: #fff8ea;
    }
    .sidebar-brand app-odyssee-brand {
      --brand-logo-width: clamp(19rem, 20vw, 24rem);
    }
    .sidebar-nav {
      width: calc(100% - 0.5rem);
      max-width: 14.25rem;
      margin-inline: auto;
      display: grid;
      align-content: start;
      gap: clamp(0.45rem, 1vh, 0.65rem);
      padding-top: clamp(0.15rem, 1.2vh, 0.85rem);
    }
    .nav-item {
      width: 100%;
      min-height: clamp(2.55rem, 5.2vh, 3.35rem);
      padding: 0 1.125rem;
      border: 1px solid transparent;
      border-radius: 0.65rem;
      display: grid;
      grid-template-columns: 1.25rem minmax(0, 1fr);
      align-items: center;
      column-gap: 0.875rem;
      color: rgba(255, 255, 255, 0.82);
      background: transparent;
      box-shadow: none;
      text-align: left;
      text-decoration: none;
      font-size: clamp(0.88rem, 1vw, 1rem);
      font-weight: 500;
      transition:
        background 0.2s ease,
        transform 0.2s ease,
        color 0.2s ease;
    }
    .nav-icon {
      width: 1.25rem;
      height: 1.25rem;
      display: grid;
      place-items: center;
    }
    .nav-icon svg {
      width: 1.25rem;
      height: 1.25rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.7;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .nav-label {
      min-width: 0;
    }
    .nav-item.active,
    .nav-item:hover {
      color: #fff;
      background: rgba(130, 120, 210, 0.34);
      border-color: rgba(255, 255, 255, 0.16);
    }
    .nav-item:hover {
      transform: translateY(-1px);
    }
    .sidebar-audio-space {
      width: calc(100% - 0.5rem);
      max-width: 14.25rem;
      height: clamp(6.2rem, 12vh, 8.2rem);
      margin-inline: auto;
      margin-top: auto;
    }
    a:focus-visible,
    button:focus-visible {
      outline: 3px solid rgba(255, 255, 255, 0.9);
      outline-offset: 3px;
    }
    @media (max-height: 800px) {
      .dashboard-sidebar {
        padding-block: 1.05rem;
        gap: 0.8rem;
      }
      .sidebar-audio-space {
        height: 5.8rem;
      }
    }
  `,
})
export class DashboardSidebarComponent {
  readonly navItems = [
    {
      label: 'Tableau de bord',
      route: '/dashboard',
      icon: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z',
    },
    {
      label: 'Mes aventures',
      route: '/aventures',
      icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z M3.3 7 12 12l8.7-5 M12 22V12',
    },
    {
      label: 'Invitations',
      route: '/invitations',
      icon: 'M4 5h16v12H5.5L4 19.5V5Z M8 9h8 M8 13h5',
    },
    {
      label: 'Archives',
      route: '/archives',
      icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5Zm0 0v-15',
    },
    {
      label: 'Paramètres',
      route: '/parametres',
      icon: 'M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .92l-.03.08a2 2 0 0 1-3.94 0l-.03-.08a1.7 1.7 0 0 0-1-.92 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.92-1l-.08-.03a2 2 0 0 1 0-3.94l.08-.03a1.7 1.7 0 0 0 .92-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.92l.03-.08a2 2 0 0 1 3.94 0l.03.08a1.7 1.7 0 0 0 1 .92 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.15.42.49.75.92 1l.08.03a2 2 0 0 1 0 3.94l-.08.03a1.7 1.7 0 0 0-.92 1Z',
    },
  ];
}

@Component({
  selector: 'app-dashboard-header',
  template: `
    <header class="dashboard-header">
      <div>
        <h1 id="dashboard-title">
          Bienvenue, <span>{{ userName() }}.</span>
        </h1>
        <p>{{ subtitle() }}</p>
      </div>
      <div class="header-actions" aria-label="Actions du compte">
        <button class="icon-button" type="button" aria-label="Notifications">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
            <path d="M10 21a2 2 0 0 0 4 0" />
          </svg>
        </button>
        <button class="icon-button" type="button" aria-label="Messages">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 5h16v14H4z" />
            <path d="m4 7 8 6 8-6" />
          </svg>
        </button>
        <div class="account-chip">
          <span class="avatar" aria-hidden="true">{{ userInitial() }}</span>
          <span>{{ userName() }}</span>
          <span class="chevron" aria-hidden="true"></span>
        </div>
      </div>
    </header>
  `,
  styles: `
    .dashboard-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1.4rem;
      min-height: 0;
    }
    h1 {
      margin: 0;
      color: #18264d;
      font:
        600 clamp(2.25rem, 3.2vw, 3.5rem) / 0.98 'Newsreader',
        serif;
      letter-spacing: 0;
    }
    h1 span {
      color: #6152c5;
    }
    p {
      margin: clamp(0.45rem, 1vh, 0.75rem) 0 0;
      color: #17264e;
      font-size: clamp(1rem, 1.45vw, 1.45rem);
      line-height: 1.25;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: clamp(0.6rem, 1vw, 0.95rem);
      color: #fff;
    }
    .icon-button,
    .account-chip {
      min-height: clamp(2.55rem, 5.2vh, 3.2rem);
      border: 1px solid rgba(255, 255, 255, 0.22);
      background: rgba(27, 36, 76, 0.2);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(10px);
    }
    .icon-button {
      width: clamp(2.55rem, 5.2vh, 3.2rem);
      padding: 0;
      border-radius: 50%;
      color: inherit;
    }
    .icon-button svg {
      width: 1.18rem;
      height: 1.18rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.6;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .account-chip {
      min-width: 0;
      padding: 0.22rem 0.65rem 0.22rem 0.22rem;
      border-radius: 999px;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      max-width: 14rem;
      color: rgba(255, 255, 255, 0.95);
      font-weight: 500;
    }
    .avatar {
      width: clamp(2.2rem, 4.6vh, 2.85rem);
      height: clamp(2.2rem, 4.6vh, 2.85rem);
      border: 2px solid rgba(255, 255, 255, 0.72);
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: linear-gradient(145deg, #27355f, #a18b79);
      font:
        600 1rem 'Newsreader',
        serif;
    }
    .chevron {
      width: 0.42rem;
      height: 0.42rem;
      border-right: 1px solid currentColor;
      border-bottom: 1px solid currentColor;
      transform: translateY(-0.12rem) rotate(45deg);
      flex: 0 0 auto;
    }
    button:focus-visible {
      outline: 3px solid rgba(255, 255, 255, 0.9);
      outline-offset: 3px;
    }
    @media (max-width: 900px) {
      .dashboard-header {
        align-items: stretch;
        flex-direction: column;
      }
      .header-actions {
        justify-content: flex-start;
      }
    }
    @media (max-height: 800px) and (min-width: 901px) {
      h1 {
        font-size: clamp(2rem, 3vw, 2.75rem);
      }
      p {
        margin-top: 0.3rem;
        font-size: 1rem;
      }
    }
  `,
})
export class DashboardHeaderComponent {
  readonly userName = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly userInitial = computed(() => this.userName().trim().charAt(0).toUpperCase() || 'A');
}

@Component({
  selector: 'app-recent-adventure-card',
  template: `
    <article
      class="recent-card"
      data-dashboard-image
      [attr.data-image-src]="adventure().image"
      [style.--card-image]="backgroundImage(adventure().image)"
    >
      <span class="recent-icon" aria-hidden="true">
        @switch (adventure().icon) {
          @case ('tree') {
            <svg viewBox="0 0 24 24">
              <path
                d="M12 22V11 M8 18h8 M7 11a5 5 0 0 1 10 0c0 3-2 5-5 5s-5-2-5-5Z M9 8a3 3 0 0 1 6 0"
              />
            </svg>
          }
          @case ('spiral') {
            <svg viewBox="0 0 24 24">
              <path
                d="M12 4a8 8 0 1 0 8 8c0-4-3-6-6-6-3.5 0-6 2.4-6 5.4 0 2.5 1.9 4.6 4.4 4.6 2 0 3.6-1.4 3.6-3.2 0-1.5-1.1-2.6-2.6-2.6-1.1 0-2 .8-2 1.8"
              />
            </svg>
          }
          @default {
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8" />
              <path d="m12 3 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z" />
            </svg>
          }
        }
      </span>
      <div class="recent-copy">
        <h3>{{ adventure().title }}</h3>
        <p>{{ adventure().chapterLabel }} · {{ adventure().statusLabel }}</p>
        <p>{{ adventure().activityLabel }}</p>
      </div>
      <button type="button" (click)="continueAdventure.emit()">Continuer</button>
    </article>
  `,
  styles: `
    .recent-card {
      position: relative;
      height: 100%;
      min-height: 0;
      overflow: hidden;
      padding: clamp(0.85rem, 1.5vh, 1.25rem);
      border: 1px solid rgba(255, 255, 255, 0.28);
      border-radius: clamp(1rem, 1.5vw, 1.35rem);
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: clamp(0.75rem, 1.2vw, 1rem);
      color: white;
      background:
        linear-gradient(90deg, rgba(12, 21, 52, 0.86), rgba(20, 30, 68, 0.54)),
        var(
          --card-image,
          radial-gradient(ellipse at 70% 28%, rgba(111, 128, 168, 0.74), transparent 44%)
        ),
        linear-gradient(135deg, #172851, #506184);
      background-size: cover;
      background-position: center;
      box-shadow: 0 16px 40px rgba(14, 24, 55, 0.2);
      backdrop-filter: blur(8px);
    }
    .recent-card::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.09), transparent 45%);
      pointer-events: none;
    }
    .recent-icon,
    .recent-copy,
    button {
      position: relative;
      z-index: 1;
    }
    .recent-icon {
      width: clamp(2.5rem, 4.2vw, 3.4rem);
      aspect-ratio: 1;
      border: 1px solid rgba(255, 255, 255, 0.72);
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: rgba(10, 18, 47, 0.24);
    }
    .recent-icon svg {
      width: 1.45rem;
      height: 1.45rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.35;
      stroke-linecap: round;
      stroke-linejoin: round;
      opacity: 0.92;
    }
    h3,
    p {
      margin: 0;
    }
    h3 {
      font:
        600 clamp(0.88rem, 1.1vw, 1.05rem) 'DM Sans',
        sans-serif;
    }
    p {
      color: rgba(255, 255, 255, 0.78);
      font-size: clamp(0.72rem, 0.9vw, 0.82rem);
      line-height: 1.45;
    }
    button {
      min-width: clamp(5.6rem, 7vw, 6.4rem);
      min-height: 2rem;
      padding: 0.45rem 0.9rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 999px;
      color: white;
      background: rgba(255, 255, 255, 0.1);
      box-shadow: none;
      font-size: 0.78rem;
      font-weight: 500;
      transition:
        transform 0.2s ease,
        background 0.2s ease;
    }
    button:hover {
      transform: translateY(-1px);
      background: rgba(255, 255, 255, 0.16);
    }
    button:focus-visible {
      outline: 3px solid rgba(255, 255, 255, 0.9);
      outline-offset: 3px;
    }
    @media (max-width: 980px) {
      .recent-card {
        grid-template-columns: auto minmax(0, 1fr);
      }
      button {
        grid-column: 2;
        justify-self: start;
      }
    }
  `,
})
export class RecentAdventureCardComponent {
  readonly adventure = input.required<DashboardAdventureView>();
  readonly continueAdventure = output<void>();

  protected backgroundImage(path: string): string {
    return `url("${path}")`;
  }
}

@Component({
  selector: 'app-dashboard',
  imports: [DashboardHeaderComponent, RecentAdventureCardComponent],
  template: `
    <section class="dashboard-main" aria-labelledby="dashboard-title">
          <app-dashboard-header [userName]="userName()" [subtitle]="dashboardSubtitle()" />

          @if (message()) {
            <p class="status-message" [class.error]="error()" aria-live="polite">
              {{ message() }}
            </p>
          }

          <section class="dashboard-section current-section" aria-labelledby="current-title">
            <h2 id="current-title">Aventure en cours</h2>
            @if (loading()) {
              <article class="current-card current-card-state skeleton-card" aria-live="polite">
                <span class="state-icon skeleton-block" aria-hidden="true"></span>
                <div class="current-copy">
                  <span class="skeleton-line short"></span>
                  <span class="skeleton-line title"></span>
                  <span class="skeleton-line"></span>
                  <span class="skeleton-line medium"></span>
                </div>
              </article>
            } @else if (loadError()) {
              <article class="current-card current-card-state">
                <span class="state-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 3 2 21h20L12 3Z M12 9v5 M12 18h.01" />
                  </svg>
                </span>
                <div class="current-copy">
                  <h3>Impossible de charger vos aventures</h3>
                  <p class="description">La récupération des données a échoué.</p>
                  <button class="primary-action" type="button" (click)="retry()">
                    Réessayer
                    <span aria-hidden="true">↻</span>
                  </button>
                </div>
              </article>
            } @else {
              <article
                class="current-card"
                [class.current-card-state]="!activeAdventure()"
                [class.empty-current-card]="!activeAdventure()"
                data-dashboard-image
                [attr.data-image-src]="currentAdventureImage()"
                [style.--card-image]="backgroundImage(currentAdventureImage())"
              >
                @if (activeAdventure(); as adventure) {
                  <div class="current-copy">
                    <h3>{{ adventure.title }}</h3>
                    <p class="chapter">
                      <span aria-hidden="true">★</span>
                      {{ adventure.chapterLabel }} <b>·</b> {{ adventure.statusLabel }}
                    </p>
                    <p class="description">{{ adventure.activityLabel }}</p>
                    <button class="primary-action" type="button" (click)="openAdventure(adventure)">
                      Continuer l'aventure
                      <span aria-hidden="true">▶</span>
                    </button>
                  </div>
                  <div class="current-meta" aria-label="Informations de l'aventure">
                    <strong>{{ adventure.modeLabel }}</strong>
                    <span>{{ adventure.statusLabel }}</span>
                  </div>
                } @else {
                  <span class="state-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="8" />
                      <path d="m12 3 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z" />
                    </svg>
                  </span>
                  <div class="current-copy">
                    <h3>Aucune aventure en cours</h3>
                    <p class="description">
                      Vous n'avez pas encore commencé d'aventure.<br />
                      Lancez-vous dans votre première odyssée !
                    </p>
                    <button class="primary-action" type="button" (click)="startNewAdventure()">
                      Commencer une aventure
                      <span aria-hidden="true">▶</span>
                    </button>
                  </div>
                }
              </article>
            }
          </section>

          <section class="dashboard-section create-section" aria-labelledby="create-title">
            <article
              class="create-card"
              data-dashboard-image
              [attr.data-image-src]="imagePaths.create"
              [style.--card-image]="backgroundImage(imagePaths.create)"
            >
              <div class="create-copy">
                <p class="section-label" id="create-title">Créer une nouvelle aventure</p>
                <h2>Écrivez votre propre légende.</h2>
                <p>
                  Imaginez un nouveau monde, invitez un compagnon et écrivez une histoire inédite.
                </p>
                <button
                  class="primary-action create-action"
                  type="button"
                  [disabled]="busy()"
                  (click)="startNewAdventure()"
                >
                  Commencer une nouvelle aventure
                  <span aria-hidden="true">+</span>
                </button>
              </div>
            </article>
          </section>

          <section class="dashboard-section recent-section" aria-labelledby="recent-title">
            <h2 id="recent-title">Vos dernières aventures</h2>
            <div class="recent-grid">
              @if (loading()) {
                @for (item of emptySlots; track item) {
                  <article class="recent-card-placeholder skeleton-card">
                    <span class="recent-placeholder-icon skeleton-block"></span>
                    <div>
                      <span class="skeleton-line medium"></span>
                      <span class="skeleton-line"></span>
                    </div>
                  </article>
                }
              } @else if (loadError()) {
                <article class="recent-card-placeholder recent-empty-wide">
                  <span class="recent-placeholder-icon" aria-hidden="true"></span>
                  <div>
                    <h3>Aventures indisponibles</h3>
                    <p>Réessayez pour actualiser cette section.</p>
                  </div>
                </article>
              } @else {
                @for (adventure of recentAdventures(); track adventure.id) {
                  <app-recent-adventure-card
                    [adventure]="adventure"
                    (continueAdventure)="openAdventure(adventure)"
                  />
                }
                @for (item of recentPlaceholderSlots(); track item) {
                  <article
                    class="recent-card-placeholder"
                    data-dashboard-image
                    [attr.data-image-src]="imagePaths.recent1"
                    [style.background-image]="recentPlaceholderBackground()"
                    [style.background-size]="'cover'"
                    [style.background-position]="'center'"
                  >
                    <span class="recent-placeholder-icon" aria-hidden="true"></span>
                    <div>
                      <h3>{{ hasAnyAdventure() ? 'Aucune autre aventure' : 'Aucune aventure' }}</h3>
                      <p>
                        {{
                          hasAnyAdventure()
                            ? 'Vos autres aventures apparaîtront ici.'
                            : 'Vos aventures apparaîtront ici une fois que vous aurez commencé.'
                        }}
                      </p>
                    </div>
                  </article>
                }
              }
            </div>
          </section>
    </section>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      min-height: 0;
      color: #f8f5ee;
    }
    .dashboard-main {
      position: relative;
      height: 100%;
      min-height: 0;
      padding: clamp(1.35rem, 3vh, 2.65rem) clamp(1.7rem, 3.2vw, 3.4rem) clamp(1.1rem, 2.5vh, 2rem);
      display: grid;
      grid-template-rows:
        auto
        minmax(0, 1.34fr)
        minmax(0, 0.96fr)
        minmax(0, 0.58fr);
      gap: clamp(0.55rem, 1.3vh, 1.15rem);
      overflow: hidden;
    }
    .status-message {
      position: absolute;
      top: 0.8rem;
      right: 2rem;
      z-index: 3;
      margin: 0;
      padding: 0.6rem 0.9rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 999px;
      color: white;
      background: rgba(25, 39, 72, 0.62);
      backdrop-filter: blur(10px);
      font-size: 0.8rem;
    }
    .status-message.error {
      color: #ffd4d4;
      background: rgba(80, 24, 38, 0.68);
    }
    .dashboard-section {
      min-height: 0;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      gap: clamp(0.45rem, 0.85vh, 0.75rem);
    }
    .dashboard-section > h2,
    .section-label {
      margin: 0;
      color: #18264d;
      font:
        700 clamp(0.72rem, 0.8vw, 0.84rem) 'DM Sans',
        sans-serif;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .current-card,
    .create-card {
      position: relative;
      min-height: 0;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: clamp(1.35rem, 1.8vw, 1.75rem);
      box-shadow: 0 20px 55px rgba(15, 23, 56, 0.2);
      backdrop-filter: blur(8px);
    }
    .current-card {
      padding: clamp(1.25rem, 3vh, 2.35rem) clamp(1.5rem, 2.8vw, 2.6rem);
      display: grid;
      grid-template-columns: minmax(0, 31rem) minmax(7rem, 1fr);
      align-items: center;
      gap: 1.5rem;
      color: white;
      background-image:
        linear-gradient(
          90deg,
          rgba(9, 21, 56, 0.9),
          rgba(15, 29, 64, 0.66) 48%,
          rgba(16, 28, 59, 0.22)
        ),
        var(
          --card-image,
          radial-gradient(ellipse at 72% 30%, rgba(116, 136, 176, 0.74), transparent 44%)
        ),
        linear-gradient(135deg, #1c315f, #6f819e);
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }
    .current-copy {
      min-width: 0;
    }
    .current-card-state {
      grid-template-columns: auto minmax(0, 1fr);
      justify-content: start;
      background-image:
        linear-gradient(90deg, rgba(10, 21, 54, 0.86), rgba(24, 35, 75, 0.48)),
        var(--card-image, none);
    }
    .state-icon {
      width: clamp(3rem, 5.4vw, 4.8rem);
      aspect-ratio: 1;
      border: 1px solid rgba(255, 255, 255, 0.58);
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: #fff6dd;
      background: rgba(255, 255, 255, 0.08);
    }
    .state-icon svg {
      width: 54%;
      height: 54%;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.35;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .current-meta {
      justify-self: center;
      width: min(13rem, 100%);
      min-height: clamp(5.2rem, 11vh, 7rem);
      padding: 1rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 1rem;
      display: grid;
      place-content: center;
      text-align: center;
      background: rgba(11, 22, 54, 0.55);
    }
    .current-meta strong {
      color: #fff;
      font-size: clamp(1rem, 1.35vw, 1.25rem);
      font-weight: 600;
    }
    .current-card h3 {
      margin: 0;
      color: white;
      font:
        600 clamp(1.55rem, 2.25vw, 2.25rem) / 1.05 'Newsreader',
        serif;
      letter-spacing: 0;
    }
    .chapter {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      margin: clamp(0.55rem, 1.2vh, 0.95rem) 0 0;
      color: rgba(255, 255, 255, 0.92);
      font-size: clamp(0.82rem, 1vw, 0.98rem);
      line-height: 1.35;
    }
    .chapter span {
      color: #ffd07c;
      font-size: 1.05rem;
    }
    .chapter b {
      font-weight: 500;
      opacity: 0.65;
    }
    .description {
      max-width: 28rem;
      margin: clamp(0.9rem, 2vh, 1.45rem) 0 0;
      color: rgba(255, 255, 255, 0.9);
      font-size: clamp(0.84rem, 1vw, 0.98rem);
      line-height: 1.55;
    }
    .primary-action {
      min-height: clamp(2.3rem, 4.6vh, 2.85rem);
      margin-top: clamp(0.8rem, 2vh, 1.4rem);
      padding: 0.62rem clamp(1.1rem, 2.1vw, 1.85rem);
      border: 0;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      color: white;
      background: linear-gradient(120deg, #7364df, #3c49b0);
      box-shadow: 0 10px 25px rgba(45, 42, 126, 0.28);
      font-size: clamp(0.8rem, 0.95vw, 0.94rem);
      font-weight: 500;
      transition:
        transform 0.2s ease,
        filter 0.2s ease,
        box-shadow 0.2s ease;
    }
    .primary-action:hover {
      transform: translateY(-2px);
      filter: brightness(1.06);
      box-shadow: 0 14px 32px rgba(45, 42, 126, 0.34);
    }
    .primary-action span {
      display: grid;
      place-items: center;
      width: 1.8rem;
      height: 1.8rem;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.16);
      line-height: 1;
    }
    .primary-action:disabled {
      cursor: wait;
      opacity: 0.72;
      transform: none;
      filter: none;
    }
    .create-section {
      grid-template-rows: minmax(0, 1fr);
    }
    .create-card {
      padding: clamp(1rem, 2.2vh, 1.55rem) clamp(1.45rem, 2.5vw, 2rem);
      display: flex;
      align-items: center;
      color: #17264e;
      background:
        linear-gradient(
          90deg,
          rgba(255, 248, 236, 0.82),
          rgba(255, 248, 236, 0.58) 39%,
          rgba(255, 255, 255, 0.12) 72%
        ),
        var(
          --card-image,
          radial-gradient(ellipse at 78% 50%, rgba(176, 188, 212, 0.9), transparent 40%)
        ),
        radial-gradient(ellipse at 78% 50%, rgba(176, 188, 212, 0.9), transparent 40%),
        rgba(255, 255, 255, 0.28);
      background-size: cover;
      background-position: center right;
    }
    .create-copy {
      width: min(34rem, 52%);
      min-width: 24rem;
    }
    .create-card h2 {
      margin: clamp(0.5rem, 1vh, 0.75rem) 0 0;
      color: #17264e;
      font:
        600 clamp(1.35rem, 2vw, 2rem) / 1.05 'Newsreader',
        serif;
      letter-spacing: 0;
    }
    .create-card p:not(.section-label) {
      max-width: 32rem;
      margin: clamp(0.55rem, 1.2vh, 0.9rem) 0 0;
      color: #1d2d55;
      font-size: clamp(0.82rem, 1vw, 0.96rem);
      line-height: 1.5;
    }
    .create-action span {
      color: #5144a0;
      background: white;
      font-size: 1.55rem;
      font-weight: 400;
    }
    .recent-grid {
      min-height: 0;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: clamp(0.8rem, 1.4vw, 1.15rem);
    }
    .recent-card-placeholder {
      height: 100%;
      min-height: 0;
      padding: clamp(0.85rem, 1.5vh, 1.25rem);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: clamp(1rem, 1.5vw, 1.35rem);
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      gap: clamp(0.75rem, 1.2vw, 1rem);
      color: rgba(255, 255, 255, 0.9);
      background:
        linear-gradient(90deg, rgba(10, 20, 50, 0.72), rgba(18, 30, 66, 0.42)),
        rgba(255, 255, 255, 0.05);
    }
    .recent-empty-wide {
      grid-column: 1 / -1;
    }
    .recent-placeholder-icon {
      width: clamp(2.5rem, 4.2vw, 3.4rem);
      aspect-ratio: 1;
      border: 1px solid rgba(255, 255, 255, 0.46);
      border-radius: 50%;
      background:
        radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.2), transparent 32%),
        rgba(255, 255, 255, 0.06);
    }
    .recent-card-placeholder h3,
    .recent-card-placeholder p {
      margin: 0;
    }
    .recent-card-placeholder h3 {
      color: #fff;
      font-size: clamp(0.88rem, 1.05vw, 1rem);
    }
    .recent-card-placeholder p {
      margin-top: 0.25rem;
      color: rgba(255, 255, 255, 0.72);
      font-size: clamp(0.72rem, 0.9vw, 0.82rem);
      line-height: 1.45;
    }
    .skeleton-block,
    .skeleton-line {
      display: block;
      background: rgba(255, 255, 255, 0.13);
    }
    .skeleton-line {
      height: 0.8rem;
      width: min(28rem, 100%);
      margin-top: 0.75rem;
      border-radius: 999px;
    }
    .skeleton-line.short {
      width: 7rem;
      margin-top: 0;
    }
    .skeleton-line.medium {
      width: 58%;
    }
    .skeleton-line.title {
      height: 1.8rem;
      width: min(21rem, 90%);
    }
    button:focus-visible {
      outline: 3px solid rgba(255, 255, 255, 0.9);
      outline-offset: 3px;
    }
    @media (max-height: 900px) {
      .dashboard-main {
        padding-block: 1.25rem 1rem;
        gap: 0.65rem;
      }
      .current-card {
        padding-block: 1.25rem;
      }
      .description {
        margin-top: 0.8rem;
      }
      .primary-action {
        margin-top: 0.8rem;
      }
    }
    @media (max-height: 800px) {
      .dashboard-main {
        padding: 1rem clamp(1.35rem, 2.6vw, 2.3rem) 0.85rem;
        gap: 0.5rem;
      }
      .dashboard-section {
        gap: 0.35rem;
      }
      .current-card {
        padding: 1rem 1.45rem;
      }
      .current-card h3 {
        font-size: 1.55rem;
      }
      .chapter,
      .description {
        font-size: 0.8rem;
      }
      .create-card {
        padding-block: 0.9rem;
      }
      .create-card h2 {
        font-size: 1.35rem;
      }
      .create-card p:not(.section-label) {
        font-size: 0.8rem;
      }
      .primary-action {
        min-height: 2.25rem;
        padding-block: 0.48rem;
      }
      .primary-action span {
        width: 1.55rem;
        height: 1.55rem;
      }
    }
    @media (max-height: 720px) {
      .dashboard-main {
        grid-template-rows:
          auto
          minmax(0, 1.24fr)
          minmax(0, 0.88fr)
          minmax(0, 0.56fr);
      }
      .description {
        display: none;
      }
    }
    @media (max-width: 980px) {
      .dashboard-main {
        height: auto;
        min-height: 100svh;
        overflow: visible;
        display: grid;
        grid-template-rows: none;
        padding: 1rem;
      }
      .current-card {
        grid-template-columns: 1fr;
      }
      .create-copy {
        width: 100%;
        min-width: 0;
      }
      .recent-grid {
        grid-template-columns: 1fr;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        transition-duration: 0.01ms !important;
      }
    }
  `,
})
export class DashboardPage implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly games = inject(GameService);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly deletionNotice = this.currentDashboardNotificationState();
  private deletionNoticeTimer: ReturnType<typeof setTimeout> | null = null;
  readonly imagePaths = DASHBOARD_IMAGES;
  readonly userName = computed(() => this.auth.user()?.displayName.trim() || 'Aventurier');
  readonly emptySlots = [0, 1, 2] as const;
  readonly busy = signal(false);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly message = signal('');
  readonly error = signal(false);
  readonly dashboardAdventures = computed(() =>
    this.games.games().map((game, index) => this.toDashboardAdventure(game, index)),
  );
  readonly activeAdventure = computed(() => this.pickActiveAdventure(this.dashboardAdventures()));
  readonly currentAdventureImage = computed(() =>
    this.activeAdventure() ? DASHBOARD_IMAGES.current : DASHBOARD_IMAGES.recent1,
  );
  readonly recentAdventures = computed(() => {
    const activeId = this.activeAdventure()?.id ?? null;
    return this.dashboardAdventures()
      .filter((adventure) => adventure.id !== activeId)
      .sort((a, b) => b.updatedAtTime - a.updatedAtTime)
      .slice(0, 3);
  });
  readonly recentPlaceholderSlots = computed(() =>
    Array.from({ length: Math.max(0, 3 - this.recentAdventures().length) }, (_, index) => index),
  );
  readonly hasAnyAdventure = computed(() => this.dashboardAdventures().length > 0);
  readonly dashboardSubtitle = computed(() =>
    this.loading()
      ? 'Votre odyssée se prépare.'
      : this.hasAnyAdventure()
        ? 'Votre odyssée continue.'
        : 'Votre odyssée commence ici.',
  );

  async ngOnInit(): Promise<void> {
    await this.refreshDashboard();
    this.showDeletionNotice(this.deletionNotice);
  }

  ngOnDestroy(): void {
    this.clearDeletionNoticeTimer();
  }

  async retry(): Promise<void> {
    await this.refreshDashboard();
  }

  async openAdventure(adventure: DashboardAdventureView): Promise<void> {
    await this.router.navigate(['/aventure', adventure.id, adventure.routeSection]);
  }

  async startNewAdventure(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(false);
    this.message.set('');
    try {
      const id = await this.games.createGame({
        title: 'Une aventure sans titre',
        playMode: 'asynchronous',
        timerSeconds: null,
        world: {
          genre: 'Univers personnalisé',
          customDescription: '',
          tone: [],
          realismLevel: 'flexible',
          violenceLevel: 'light',
          romanceEnabled: false,
          characterDeathEnabled: false,
          customRules: [],
          forbiddenElements: [],
        },
      });
      await this.games.refresh();
      await this.router.navigate(['/aventure', id, 'salon']);
    } catch (error) {
      this.fail(error);
    } finally {
      this.busy.set(false);
    }
  }

  private async refreshDashboard(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    this.error.set(false);
    this.message.set('');
    try {
      await this.games.refresh();
    } catch (error) {
      this.loadError.set(true);
      this.fail(error);
    } finally {
      this.loading.set(false);
    }
  }

  private pickActiveAdventure(adventures: DashboardAdventureView[]): DashboardAdventureView | null {
    const byActivity = [...adventures].sort((a, b) => b.updatedAtTime - a.updatedAtTime);
    return (
      byActivity.find((adventure) => this.isActiveStatus(adventure.status)) ??
      byActivity.find((adventure) => !this.isCompletedStatus(adventure.status)) ??
      null
    );
  }

  private toDashboardAdventure(game: GameSummary, index: number): DashboardAdventureView {
    const title = game.title.trim() || 'Aventure sans titre';
    const updatedAtTime = Date.parse(game.updatedAt);
    return {
      id: game.id,
      title,
      status: game.status,
      statusLabel: this.statusLabel(game.status),
      chapterLabel: game.turnNumber > 0 ? `Tour ${game.turnNumber}` : 'Préparation',
      activityLabel: this.activityLabel(game.updatedAt),
      modeLabel: game.playMode === 'realtime' ? 'Temps réel' : 'Asynchrone',
      image: DASHBOARD_IMAGES.current,
      icon: this.fallbackIcon(index),
      routeSection: this.routeSection(game.status),
      updatedAtTime: Number.isFinite(updatedAtTime) ? updatedAtTime : 0,
    };
  }

  private routeSection(status: string): DashboardAdventureView['routeSection'] {
    if (status === 'active') return 'jouer';
    if (status === 'character_creation') return 'personnage';
    return 'salon';
  }

  private statusLabel(status: string): string {
    switch (status) {
      case 'waiting':
        return 'En attente';
      case 'character_creation':
        return 'Personnages';
      case 'ready':
        return 'Prête';
      case 'active':
      case 'in_progress':
        return 'En cours';
      case 'paused':
        return 'En pause';
      case 'completed':
      case 'finished':
        return 'Terminée';
      default:
        return status.trim() || 'Statut indisponible';
    }
  }

  private isActiveStatus(status: string): boolean {
    return ['active', 'in_progress'].includes(status);
  }

  private isCompletedStatus(status: string): boolean {
    return ['completed', 'finished', 'archived'].includes(status);
  }

  private activityLabel(value: string): string {
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) return 'Dernière activité indisponible';
    const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
    const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
      ['year', 31_536_000],
      ['month', 2_592_000],
      ['week', 604_800],
      ['day', 86_400],
      ['hour', 3_600],
      ['minute', 60],
    ];
    const formatter = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
    for (const [unit, seconds] of units) {
      if (Math.abs(diffSeconds) >= seconds) {
        return `Dernière activité : ${formatter.format(Math.round(diffSeconds / seconds), unit)}`;
      }
    }
    return 'Dernière activité : à l’instant';
  }

  protected backgroundImage(path: string): string {
    return `url("${path}")`;
  }

  protected recentPlaceholderBackground(): string {
    return `linear-gradient(90deg, rgba(10, 20, 50, 0.72), rgba(18, 30, 66, 0.42)), ${this.backgroundImage(DASHBOARD_IMAGES.recent1)}`;
  }

  private fallbackIcon(index: number): DashboardAdventureView['icon'] {
    return (['compass', 'tree', 'spiral'] as const)[index % 3];
  }

  private showDeletionNotice(notification: DashboardNotificationState | undefined): void {
    const code = notification?.notification?.code;
    if (!code) return;
    const message = DASHBOARD_NOTIFICATION_MESSAGES[code];
    if (!message) return;
    this.clearDashboardNotificationState();
    this.error.set(false);
    this.message.set(message);
    this.clearDeletionNoticeTimer();
    this.deletionNoticeTimer = setTimeout(() => {
      if (this.message() === message) this.message.set('');
      this.deletionNoticeTimer = null;
    }, DELETION_NOTICE_DURATION_MS);
  }

  private currentDashboardNotificationState(): DashboardNotificationState | undefined {
    const historyState = this.document.defaultView?.history.state as
      DashboardNotificationState | undefined;
    return (
      (this.router.getCurrentNavigation()?.extras.state as
        DashboardNotificationState | undefined) ?? historyState
    );
  }

  private clearDashboardNotificationState(): void {
    const view = this.document.defaultView;
    const state = view?.history.state as DashboardNotificationState | undefined;
    if (!view || !state?.notification) return;
    const cleanState = { ...state };
    delete cleanState.notification;
    view.history.replaceState(cleanState, '', view.location.href);
  }

  private clearDeletionNoticeTimer(): void {
    if (!this.deletionNoticeTimer) return;
    clearTimeout(this.deletionNoticeTimer);
    this.deletionNoticeTimer = null;
  }

  private fail(error: unknown): void {
    this.error.set(true);
    const raw = this.errorMessage(error);
    if (isDevMode() && !raw.includes('too_many_active_games'))
      console.error('Dashboard error', error);
    this.message.set(
      raw.includes('too_many_active_games')
        ? 'Vous avez atteint la limite de parties actives.'
        : raw.includes('authentication') || raw.includes('JWT')
          ? 'Votre session a expiré. Déconnectez-vous puis reconnectez-vous.'
          : 'Impossible de charger vos aventures pour le moment.',
    );
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object') {
      const candidate = error as Record<string, unknown>;
      const message = typeof candidate['message'] === 'string' ? candidate['message'] : '';
      const details = typeof candidate['details'] === 'string' ? candidate['details'] : '';
      const hint = typeof candidate['hint'] === 'string' ? candidate['hint'] : '';
      const code = typeof candidate['code'] === 'string' ? `[${candidate['code']}] ` : '';
      const combined = `${code}${message} ${details} ${hint}`.trim();
      if (combined) return combined;
    }
    return 'Une erreur inconnue est survenue pendant la communication avec Supabase.';
  }
}
