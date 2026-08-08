import type { OnInit } from '@angular/core';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../core/game.service';
import type { GameSummary } from '../core/game.service';

type ArchiveView = {
  id: string;
  title: string;
  companionLabel: string;
  chaptersLabel: string;
  finishedLabel: string;
};

@Component({
  selector: 'app-archives-page',
  template: `
    <section class="dashboard-subpage" aria-labelledby="archives-title">
      <header class="page-header">
        <p>Archives</p>
        <h1 id="archives-title">Bibliothèque des histoires terminées</h1>
      </header>

      @if (message()) {
        <p class="status-message error" aria-live="polite">{{ message() }}</p>
      }

      <div class="archive-grid">
        @for (archive of archives(); track archive.id) {
          <article class="archive-card">
            <div class="cover" aria-hidden="true"></div>
            <div class="archive-copy">
              <span class="pill">Terminée</span>
              <h2>{{ archive.title }}</h2>
              <dl>
                <div>
                  <dt>Compagnon</dt>
                  <dd>{{ archive.companionLabel }}</dd>
                </div>
                <div>
                  <dt>Chapitres</dt>
                  <dd>{{ archive.chaptersLabel }}</dd>
                </div>
                <div>
                  <dt>Fin</dt>
                  <dd>{{ archive.finishedLabel }}</dd>
                </div>
              </dl>
              <button type="button" (click)="open(archive)">Consulter</button>
            </div>
          </article>
        } @empty {
          <article class="empty-card">
            <h2>Aucune archive</h2>
            <p>
              Les aventures conclues deviendront une bibliothèque personnelle de récits écrits à
              deux.
            </p>
          </article>
        }
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
    .page-header p {
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
    .status-message {
      margin: 0;
      padding: 0.7rem 0.9rem;
      border-radius: 0.8rem;
      color: #ffd4d4;
      background: rgba(80, 24, 38, 0.62);
    }
    .archive-grid {
      min-height: 0;
      overflow: auto;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-content: start;
      gap: 1rem;
      padding-right: 0.2rem;
    }
    .archive-card,
    .empty-card {
      min-height: 17rem;
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 1rem;
      overflow: hidden;
      color: white;
      background: rgba(255, 255, 255, 0.16);
      backdrop-filter: blur(12px);
      box-shadow: 0 18px 45px rgba(15, 23, 56, 0.14);
    }
    .archive-card {
      display: grid;
      grid-template-columns: minmax(10rem, 0.72fr) minmax(0, 1fr);
    }
    .cover {
      min-height: 100%;
      background:
        linear-gradient(180deg, rgba(9, 16, 45, 0.16), rgba(9, 16, 45, 0.64)),
        url('/images/dashboard/DernierAventure.png') center / cover;
    }
    .archive-copy,
    .empty-card {
      padding: 1.2rem;
    }
    .pill {
      display: inline-flex;
      padding: 0.24rem 0.55rem;
      border: 1px solid rgba(255, 255, 255, 0.24);
      border-radius: 999px;
      color: rgba(255, 255, 255, 0.86);
      font-size: 0.72rem;
    }
    h2 {
      margin: 0.65rem 0 0;
      color: white;
      font: 600 clamp(1.45rem, 2vw, 2rem) / 1.05 'Newsreader', serif;
      letter-spacing: 0;
    }
    dl {
      display: grid;
      gap: 0.7rem;
      margin: 1rem 0 0;
    }
    dt {
      color: rgba(255, 255, 255, 0.62);
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    dd,
    p {
      margin: 0.2rem 0 0;
      color: rgba(255, 255, 255, 0.82);
      line-height: 1.45;
    }
    button {
      min-height: 2.2rem;
      margin-top: 1rem;
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
    .empty-card {
      display: grid;
      align-content: center;
      background:
        linear-gradient(90deg, rgba(10, 20, 50, 0.76), rgba(18, 30, 66, 0.42)),
        url('/images/dashboard/DernierAventure.png') center / cover;
    }
    @media (max-width: 980px) {
      .dashboard-subpage {
        height: auto;
        min-height: 100svh;
        overflow: visible;
        padding: 1rem;
      }
      .archive-grid {
        grid-template-columns: 1fr;
        overflow: visible;
      }
      .archive-card {
        grid-template-columns: 1fr;
      }
      .cover {
        min-height: 10rem;
      }
    }
  `,
})
export class ArchivesPage implements OnInit {
  private readonly games = inject(GameService);
  private readonly router = inject(Router);
  readonly message = signal('');
  readonly archives = computed(() =>
    this.games
      .games()
      .filter((game) => this.isCompleted(game.status))
      .map((game) => this.toArchive(game)),
  );

  async ngOnInit(): Promise<void> {
    try {
      await this.games.refresh();
    } catch (error) {
      console.error('Failed to load archives', error);
      this.message.set('Impossible de charger les archives pour le moment.');
    }
  }

  async open(archive: ArchiveView): Promise<void> {
    await this.router.navigate(['/aventure', archive.id, 'journal']);
  }

  private toArchive(game: GameSummary): ArchiveView {
    return {
      id: game.id,
      title: game.title.trim() || 'Une aventure sans titre',
      companionLabel: 'Votre compagnon',
      chaptersLabel: game.turnNumber > 0 ? `${game.turnNumber} tours` : 'Non renseigné',
      finishedLabel: this.dateLabel(game.updatedAt),
    };
  }

  private isCompleted(status: string): boolean {
    return ['completed', 'finished', 'archived'].includes(status);
  }

  private dateLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date inconnue';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }
}
