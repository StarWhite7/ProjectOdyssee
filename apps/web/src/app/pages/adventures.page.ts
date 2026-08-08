import type { OnInit } from '@angular/core';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../core/game.service';
import type { GameSummary } from '../core/game.service';

type AdventureCardView = {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  companionLabel: string;
  activityLabel: string;
  turnLabel: string;
  actionLabel: 'Continuer' | 'Rejoindre' | 'Consulter';
  route: unknown[];
  cover: string;
  updatedAtTime: number;
};

const ADVENTURE_COVERS = {
  playable: '/images/dashboard/AventureEnCours.png',
  archived: '/images/dashboard/DernierAventure.png',
} as const;

@Component({
  selector: 'app-adventures-page',
  template: `
    <section class="dashboard-subpage" aria-labelledby="adventures-title">
      <header class="page-header">
        <div>
          <p>Mes aventures</p>
          <h1 id="adventures-title">Toutes vos odyssées</h1>
        </div>
        <div class="search-shell" aria-label="Filtre visuel">
          <span aria-hidden="true">⌕</span>
          <input type="search" placeholder="Rechercher une aventure" disabled />
        </div>
      </header>

      @if (message()) {
        <p class="status-message error" aria-live="polite">{{ message() }}</p>
      }

      <div class="adventure-sections">
        <section class="adventure-section" aria-labelledby="current-adventures">
          <h2 id="current-adventures">En cours</h2>
          <div class="cards">
            @for (adventure of inProgressAdventures(); track adventure.id) {
              <article class="adventure-card" [style.--cover]="background(adventure.cover)">
                <div>
                  <span class="pill">{{ adventure.statusLabel }}</span>
                  <h3>{{ adventure.title }}</h3>
                  <p>{{ adventure.companionLabel }}</p>
                  <p>{{ adventure.turnLabel }} · {{ adventure.activityLabel }}</p>
                </div>
                <button type="button" (click)="open(adventure)">{{ adventure.actionLabel }}</button>
              </article>
            } @empty {
              <article class="empty-card">
                <h3>Aucune aventure jouable</h3>
                <p>Vos parties actives apparaîtront ici.</p>
              </article>
            }
          </div>
        </section>

        <section class="adventure-section" aria-labelledby="waiting-adventures">
          <h2 id="waiting-adventures">En attente</h2>
          <div class="cards">
            @for (adventure of waitingAdventures(); track adventure.id) {
              <article class="adventure-card" [style.--cover]="background(adventure.cover)">
                <div>
                  <span class="pill">{{ adventure.statusLabel }}</span>
                  <h3>{{ adventure.title }}</h3>
                  <p>{{ adventure.companionLabel }}</p>
                  <p>{{ adventure.turnLabel }} · {{ adventure.activityLabel }}</p>
                </div>
                <button type="button" (click)="open(adventure)">{{ adventure.actionLabel }}</button>
              </article>
            } @empty {
              <article class="empty-card">
                <h3>Aucune attente</h3>
                <p>Les invitations et préparations ouvertes seront listées ici.</p>
              </article>
            }
          </div>
        </section>

        <section class="adventure-section" aria-labelledby="completed-adventures">
          <h2 id="completed-adventures">Terminées</h2>
          <div class="cards">
            @for (adventure of completedAdventures(); track adventure.id) {
              <article class="adventure-card archived" [style.--cover]="background(adventure.cover)">
                <div>
                  <span class="pill">{{ adventure.statusLabel }}</span>
                  <h3>{{ adventure.title }}</h3>
                  <p>{{ adventure.companionLabel }}</p>
                  <p>{{ adventure.turnLabel }} · {{ adventure.activityLabel }}</p>
                </div>
                <button type="button" (click)="open(adventure)">{{ adventure.actionLabel }}</button>
              </article>
            } @empty {
              <article class="empty-card">
                <h3>Aucune aventure terminée</h3>
                <p>Vos récits conclus rejoindront cette section.</p>
              </article>
            }
          </div>
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
      grid-template-rows: auto auto minmax(0, 1fr);
      gap: clamp(0.9rem, 1.8vh, 1.4rem);
      overflow: hidden;
      color: #17264e;
    }
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
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
    .search-shell {
      min-width: min(18rem, 100%);
      min-height: 2.65rem;
      padding: 0 0.95rem;
      border: 1px solid rgba(255, 255, 255, 0.26);
      border-radius: 999px;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      color: rgba(255, 255, 255, 0.76);
      background: rgba(20, 32, 70, 0.34);
      backdrop-filter: blur(10px);
    }
    input {
      width: 100%;
      border: 0;
      color: white;
      background: transparent;
      outline: 0;
    }
    input::placeholder {
      color: rgba(255, 255, 255, 0.68);
    }
    .status-message {
      margin: 0;
      padding: 0.7rem 0.9rem;
      border-radius: 0.8rem;
      color: #ffd4d4;
      background: rgba(80, 24, 38, 0.62);
    }
    .adventure-sections {
      min-height: 0;
      overflow: auto;
      display: grid;
      gap: 1rem;
      padding-right: 0.2rem;
    }
    .adventure-section {
      display: grid;
      gap: 0.55rem;
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.9rem;
    }
    .adventure-card,
    .empty-card {
      min-height: 10.5rem;
      padding: 1.1rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 1rem;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1rem;
      color: white;
      background-image:
        linear-gradient(90deg, rgba(10, 20, 50, 0.84), rgba(18, 30, 66, 0.48)),
        var(--cover);
      background-size: cover;
      background-position: center;
      box-shadow: 0 18px 45px rgba(15, 23, 56, 0.18);
      overflow: hidden;
    }
    .empty-card {
      display: block;
      background:
        linear-gradient(90deg, rgba(10, 20, 50, 0.72), rgba(18, 30, 66, 0.42)),
        rgba(255, 255, 255, 0.05);
    }
    .archived {
      background-position: center bottom;
    }
    .pill {
      display: inline-flex;
      padding: 0.26rem 0.55rem;
      border: 1px solid rgba(255, 255, 255, 0.24);
      border-radius: 999px;
      color: rgba(255, 255, 255, 0.86);
      font-size: 0.72rem;
    }
    h3 {
      margin: 0.55rem 0 0;
      font: 600 clamp(1.2rem, 1.55vw, 1.55rem) / 1.05 'Newsreader', serif;
      color: white;
      letter-spacing: 0;
    }
    p {
      margin: 0.35rem 0 0;
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.9rem;
      line-height: 1.4;
    }
    button {
      flex: 0 0 auto;
      min-height: 2.15rem;
      padding: 0.45rem 1rem;
      border: 1px solid rgba(255, 255, 255, 0.24);
      border-radius: 999px;
      color: white;
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(8px);
    }
    button:hover {
      background: rgba(116, 96, 223, 0.58);
    }
    @media (max-width: 980px) {
      .dashboard-subpage {
        height: auto;
        min-height: 100svh;
        overflow: visible;
        padding: 1rem;
      }
      .page-header,
      .adventure-card {
        display: block;
      }
      .search-shell {
        margin-top: 1rem;
      }
      .adventure-sections {
        overflow: visible;
      }
      .cards {
        grid-template-columns: 1fr;
      }
      button {
        margin-top: 0.9rem;
      }
    }
  `,
})
export class AdventuresPage implements OnInit {
  private readonly games = inject(GameService);
  private readonly router = inject(Router);
  readonly message = signal('');
  readonly adventures = computed(() =>
    this.games.games().map((game) => this.toAdventureCard(game)),
  );
  readonly inProgressAdventures = computed(() =>
    this.adventures().filter(
      (adventure) => !this.isWaiting(adventure.status) && !this.isCompleted(adventure.status),
    ),
  );
  readonly waitingAdventures = computed(() =>
    this.adventures().filter((adventure) => this.isWaiting(adventure.status)),
  );
  readonly completedAdventures = computed(() =>
    this.adventures().filter((adventure) => this.isCompleted(adventure.status)),
  );

  async ngOnInit(): Promise<void> {
    try {
      await this.games.refresh();
    } catch (error) {
      console.error('Failed to load adventures', error);
      this.message.set('Impossible de charger vos aventures pour le moment.');
    }
  }

  async open(adventure: AdventureCardView): Promise<void> {
    await this.router.navigate(adventure.route);
  }

  protected background(path: string): string {
    return `url("${path}")`;
  }

  private toAdventureCard(game: GameSummary): AdventureCardView {
    const status = game.status;
    const completed = this.isCompleted(status);
    return {
      id: game.id,
      title: game.title.trim() || 'Une aventure sans titre',
      status,
      statusLabel: this.statusLabel(status),
      companionLabel: this.companionLabel(status),
      activityLabel: this.activityLabel(game.updatedAt),
      turnLabel: game.turnNumber > 0 ? `Tour ${game.turnNumber}` : 'Préparation',
      actionLabel: completed ? 'Consulter' : this.isWaiting(status) ? 'Rejoindre' : 'Continuer',
      route: this.routeFor(game),
      cover: completed ? ADVENTURE_COVERS.archived : ADVENTURE_COVERS.playable,
      updatedAtTime: Date.parse(game.updatedAt) || 0,
    };
  }

  private routeFor(game: GameSummary): unknown[] {
    if (this.isCompleted(game.status)) return ['/aventure', game.id, 'journal'];
    if (game.status === 'active') return ['/aventure', game.id, 'jouer'];
    if (game.status === 'character_creation') return ['/aventure', game.id, 'personnage'];
    return ['/aventure', game.id, 'salon'];
  }

  private isWaiting(status: string): boolean {
    return status === 'waiting' || status === 'character_creation';
  }

  private isCompleted(status: string): boolean {
    return ['completed', 'finished', 'archived'].includes(status);
  }

  private statusLabel(status: string): string {
    switch (status) {
      case 'waiting':
        return 'En attente';
      case 'character_creation':
        return 'Préparation';
      case 'ready':
        return 'Prête';
      case 'active':
        return 'En cours';
      case 'paused':
        return 'En pause';
      case 'completed':
      case 'finished':
      case 'archived':
        return 'Terminée';
      default:
        return status || 'Aventure';
    }
  }

  private companionLabel(status: string): string {
    return status === 'waiting' ? 'Compagnon à inviter' : 'Votre compagnon';
  }

  private activityLabel(value: string): string {
    const time = Date.parse(value);
    if (!Number.isFinite(time)) return 'Dernière activité inconnue';
    const diff = Date.now() - time;
    const minutes = Math.max(0, Math.round(diff / 60000));
    if (minutes < 2) return "Dernière activité à l'instant";
    if (minutes < 60) return `Dernière activité il y a ${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `Dernière activité il y a ${hours} h`;
    const days = Math.round(hours / 24);
    return `Dernière activité il y a ${days} j`;
  }
}
