import type { OnInit } from '@angular/core';
import { Component, inject, isDevMode, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { GameService } from '../core/game.service';
import type { LocalAdventure } from '../core/game.service';

@Component({
  selector: 'app-details',
  imports: [RouterLink],
  template: `<div class="shell">
    <header class="topbar">
      <a class="brand" [routerLink]="['/aventure', gameId, 'jouer']">Nerys</a
      ><a class="button secondary" [routerLink]="['/aventure', gameId, 'jouer']">Retour au récit</a>
    </header>
    <main id="main">
      @if (loading()) {
        <section class="panel state-panel" aria-live="polite">
          <p>Chargement de l'aventure...</p>
        </section>
      } @else if (error()) {
        <section class="panel state-panel error-panel" aria-live="assertive">
          <h2>Impossible de charger cette aventure pour le moment.</h2>
          <p>{{ error() }}</p>
          <button type="button" class="button" (click)="retry()">Réessayer</button>
        </section>
      } @else if (game(); as current) {
        <p class="eyebrow">{{ current.title }}</p>
        <h2>{{ title() }}</h2>
        @switch (section) {
          @case ('journal') {
            <div class="timeline">
              @for (turn of reverse(current.turns); track turn.id) {
                <article class="panel">
                  <span class="pill">Tour {{ turn.number }}</span>
                  <h3>{{ turn.location }}</h3>
                  <p>{{ turn.scene }}</p>
                  @if (turn.resolution) {
                    <blockquote>{{ turn.resolution }}</blockquote>
                  }
                </article>
              }
            </div>
          }
          @case ('souvenirs') {
            <div class="grid two-cols">
              @for (memory of reverse(current.memories); track memory.id) {
                <article class="panel memory">
                  <span class="pill">Importance {{ memory.importance }}/10</span>
                  <h3>{{ memory.title }}</h3>
                  <p>{{ memory.summary }}</p>
                  <small>{{ memory.type }}</small>
                </article>
              } @empty {
                <div class="panel"><p>Les souvenirs importants apparaîtront ici.</p></div>
              }
            </div>
          }
          @case ('personnages') {
            <div class="grid two-cols">
              @for (character of current.characters; track character.id) {
                <article class="panel character">
                  <div class="portrait">{{ character.name[0] }}</div>
                  <h3>{{ character.name }}</h3>
                  <p>{{ character.appearance }}</p>
                  <div class="tags">
                    @for (trait of character.personalityTraits; track trait) {
                      <span class="pill">{{ trait }}</span>
                    }
                  </div>
                  <h4>État émotionnel</h4>
                  <p>{{ character.currentEmotionalState.join(', ') }}</p>
                  @if (character.ownerId === auth.user()?.id) {
                    <a class="button secondary" [routerLink]="['/aventure', gameId, 'personnage']"
                      >Modifier ma fiche</a
                    >
                  }
                </article>
              }
            </div>
          }
          @case ('parametres') {
            <article class="panel">
              <h3>Règles de la partie</h3>
              <dl>
                <dt>Mode</dt>
                <dd>{{ current.playMode === 'realtime' ? 'Temps réel' : 'Libre' }}</dd>
                <dt>Univers</dt>
                <dd>{{ current.world.genre }}</dd>
                <dt>Romance</dt>
                <dd>{{ current.world.romanceEnabled ? 'Autorisée' : 'Désactivée' }}</dd>
                <dt>Mort des personnages</dt>
                <dd>{{ current.world.characterDeathEnabled ? 'Possible' : 'Désactivée' }}</dd>
                <dt>Limites</dt>
                <dd>
                  {{ current.world.forbiddenElements.join(', ') || 'Aucune limite personnalisée' }}
                </dd>
              </dl>
            </article>
          }
          @default {
            <article class="panel"><h3>Section introuvable</h3></article>
          }
        }
      }
    </main>
  </div>`,
  styles: [
    `
      main {
        padding: 3vh 0 5rem;
      }
      .state-panel {
        max-width: 820px;
      }
      .state-panel h2 {
        margin-top: 0;
      }
      .error-panel {
        border-color: rgba(255, 134, 134, 0.36);
      }
      .timeline {
        display: grid;
        gap: 1rem;
      }
      .timeline article {
        max-width: 820px;
      }
      .timeline blockquote {
        border-left: 2px solid var(--accent);
        padding-left: 1rem;
        color: #dcebe7;
      }
      .memory h3,
      .character h3 {
        font-size: 2rem;
      }
      .portrait {
        width: 70px;
        height: 70px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: var(--violet);
        color: #0b0b18;
        font: 600 2rem 'Newsreader';
      }
      .tags {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      dt {
        color: var(--muted);
        margin-top: 1rem;
      }
      dd {
        margin: 0.3rem 0;
        font-size: 1.1rem;
      }
    `,
  ],
})
export class DetailsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly games = inject(GameService);
  readonly auth = inject(AuthService);
  readonly gameId = this.route.snapshot.paramMap.get('id')!;
  readonly section = this.route.snapshot.paramMap.get('section')!;
  readonly game = signal<LocalAdventure | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly title = signal(
    (
      {
        journal: 'Journal de l’aventure',
        souvenirs: 'Souvenirs persistants',
        personnages: 'Personnages',
        parametres: 'Paramètres de la partie',
      } as Record<string, string>
    )[this.section] ?? 'Aventure',
  );
  async ngOnInit(): Promise<void> {
    await this.load();
  }
  async retry(): Promise<void> {
    await this.load();
  }
  reverse<T>(items: T[]) {
    return [...items].reverse();
  }
  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.game.set(await this.games.load(this.gameId));
    } catch (error) {
      if (isDevMode()) console.error('Failed to load adventure details', error);
      this.game.set(null);
      this.error.set('Réessayez dans quelques instants.');
    } finally {
      this.loading.set(false);
    }
  }
}
