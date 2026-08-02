import type { OnInit } from '@angular/core';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { GameService } from '../core/game.service';

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, RouterLink],
  template: `<div class="shell">
    <header class="topbar">
      <a class="brand" routerLink="/">ODYSSÉE</a>
      <div class="user">
        <span>{{ auth.user()?.displayName }}</span
        ><span class="pill">{{ auth.backend() === 'mock' ? 'Mock' : 'Supabase' }}</span
        ><button class="secondary small" (click)="logout()">Déconnexion</button>
      </div>
    </header>
    <main id="main">
      <p class="eyebrow">Tableau de bord</p>
      <h2>Où partons-nous ?</h2>
      @if (message()) {
        <p class="notice" [class.error]="error()">{{ message() }}</p>
      }
      <div class="grid two-cols">
        <section class="panel">
          <h3>Créer une aventure</h3>
          <div class="grid">
            <label class="field">Titre<input [(ngModel)]="title" maxlength="160" /></label
            ><label class="field">Univers<input [(ngModel)]="genre" maxlength="80" /></label
            ><label class="field"
              >Description libre<textarea
                [(ngModel)]="description"
                maxlength="3000"
              ></textarea></label
            ><label class="field">Ambiance<input [(ngModel)]="tone" maxlength="80" /></label
            ><label class="field"
              >Rythme<select [(ngModel)]="mode">
                <option value="asynchronous">Libre, sans minuterie</option>
                <option value="realtime">Temps réel</option>
              </select></label
            >
            @if (mode === 'realtime') {
              <label class="field"
                >Durée du tour<select [(ngModel)]="timer">
                  <option [ngValue]="60">1 minute</option>
                  <option [ngValue]="120">2 minutes</option>
                  <option [ngValue]="300">5 minutes</option>
                </select></label
              >
            }
            <div class="checks">
              <label><input type="checkbox" [(ngModel)]="romance" /> Romance possible</label
              ><label
                ><input type="checkbox" [(ngModel)]="death" /> Mort des personnages possible</label
              >
            </div>
            <label class="field"
              >Éléments interdits<input
                [(ngModel)]="forbidden"
                placeholder="Séparés par des virgules" /></label
            ><button (click)="create()" [disabled]="busy()">Créer l’aventure</button
            ><button class="secondary" (click)="demo()">Ouvrir la démonstration</button>
          </div>
        </section>
        <section>
          <div class="panel join">
            <h3>Rejoindre</h3>
            <label class="field"
              >Code d’invitation<input
                [(ngModel)]="code"
                maxlength="10"
                placeholder="NACRE-27" /></label
            ><button class="secondary" (click)="join()">Rejoindre</button>
          </div>
          <h3 class="list-title">Vos aventures</h3>
          <div class="grid">
            @for (game of games.games(); track game.id) {
              <a
                class="game-card panel"
                [routerLink]="['/aventure', game.id, game.status === 'active' ? 'jouer' : 'salon']"
                ><div>
                  <strong>{{ game.title }}</strong>
                  <p>
                    Tour {{ game.turnNumber }} ·
                    {{ game.playMode === 'realtime' ? 'Temps réel' : 'Mode libre' }}
                  </p>
                </div>
                <span class="pill">{{ label(game.status) }}</span></a
              >
            } @empty {
              <div class="empty panel"><p>Aucune aventure pour le moment.</p></div>
            }
          </div>
        </section>
      </div>
    </main>
  </div>`,
  styles: [
    `
      .user {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }
      .small {
        padding: 0.55rem 0.8rem;
      }
      .panel h3 {
        font-size: 2rem;
      }
      .checks {
        display: grid;
        gap: 0.5rem;
        color: var(--muted);
      }
      .checks input {
        width: auto;
      }
      .notice {
        padding: 0.8rem 1rem;
        background: #15241f;
        border-radius: 0.8rem;
      }
      .error {
        background: #351b22;
        color: #ffb5b5;
      }
      .join {
        margin-bottom: 2rem;
      }
      .list-title {
        font-size: 1.7rem;
      }
      .game-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        text-decoration: none;
        color: var(--ink);
        padding: 1.1rem;
      }
      .game-card p {
        margin: 0.3rem 0;
      }
      .empty {
        text-align: center;
      }
    `,
  ],
})
export class DashboardPage implements OnInit {
  readonly auth = inject(AuthService);
  readonly games = inject(GameService);
  private readonly router = inject(Router);
  title = 'Une aventure sans titre';
  genre = 'Cité futuriste';
  description = '';
  tone = 'Mystère et émotion';
  mode: 'realtime' | 'asynchronous' = 'asynchronous';
  timer = 120;
  romance = false;
  death = false;
  forbidden = '';
  code = '';
  readonly busy = signal(false);
  readonly message = signal('');
  readonly error = signal(false);
  async ngOnInit() {
    try {
      await this.games.refresh();
    } catch (e) {
      this.fail(e);
    }
  }
  async create() {
    this.busy.set(true);
    try {
      const id = await this.games.createGame({
        title: this.title.trim() || 'Une aventure sans titre',
        playMode: this.mode,
        timerSeconds: this.mode === 'realtime' ? this.timer : null,
        world: {
          genre: this.genre.trim() || 'Univers personnalisé',
          customDescription: this.description,
          tone: this.tone
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean),
          realismLevel: 'flexible',
          violenceLevel: 'light',
          romanceEnabled: this.romance,
          characterDeathEnabled: this.death,
          customRules: [],
          forbiddenElements: this.forbidden
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean),
        },
      });
      await this.router.navigate(['/aventure', id, 'salon']);
    } catch (e) {
      this.fail(e);
    } finally {
      this.busy.set(false);
    }
  }
  async join() {
    try {
      const id = await this.games.join(this.code);
      await this.router.navigate(['/aventure', id, 'salon']);
    } catch (e) {
      this.fail(e);
    }
  }
  demo() {
    const id = this.games.createDemo();
    void this.router.navigate(['/aventure', id, 'jouer']);
  }
  async logout() {
    await this.auth.signOut();
    await this.router.navigateByUrl('/');
  }
  label(status: string) {
    return (
      (
        {
          waiting: 'En attente',
          character_creation: 'Personnages',
          ready: 'Prête',
          active: 'En cours',
          paused: 'En pause',
          completed: 'Terminée',
        } as Record<string, string>
      )[status] ?? status
    );
  }
  private fail(e: unknown) {
    this.error.set(true);
    this.message.set(e instanceof Error ? e.message : 'Une erreur est survenue.');
  }
}
