import type { OnDestroy, OnInit } from '@angular/core';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { GameService } from '../core/game.service';
import type { LocalAdventure } from '../core/game.service';
import { dashboardNotificationState } from '../shared/dashboard-notification';
import { DeleteGameDialogComponent } from '../shared/delete-game-dialog.component';

@Component({
  selector: 'app-lobby',
  imports: [RouterLink, DeleteGameDialogComponent],
  template: `<div class="shell">
    <header class="topbar">
      <a class="brand" routerLink="/tableau-de-bord">ODYSSÉE</a>
      <div class="lobby-actions">
        <span class="pill">Salon privé</span>
        <app-delete-game-dialog [gameId]="gameId" (deleted)="onGameDeleted()" />
      </div>
    </header>
    <main id="main">
      @if (loading()) {
        <section class="panel"><p>Chargement du salon…</p></section>
      } @else if (error()) {
        <section class="panel error">
          <h2>Salon indisponible</h2>
          <p>{{ error() }}</p>
        </section>
      } @else if (game(); as current) {
        <p class="eyebrow">{{ current.title }}</p>
        <h2>Préparez votre départ</h2>
        <div class="grid two-cols">
          <section class="panel code">
            <p>CODE D’INVITATION</p>
            <strong>{{ current.inviteCode }}</strong
            ><button class="secondary" (click)="copy(current.inviteCode)">
              {{ copied() ? 'Copié !' : 'Copier le code' }}
            </button>
            <p>Partagez-le uniquement avec votre partenaire.</p>
          </section>
          <section class="panel">
            <h3>Joueurs</h3>
            <div class="players">
              <div>
                <span class="avatar">1</span>
                <div>
                  <strong>Vous</strong>
                  <p>{{ ownCharacter() ? 'Personnage validé' : 'Personnage à créer' }}</p>
                </div>
              </div>
              <div>
                <span class="avatar secondary-avatar">2</span>
                <div>
                  <strong>{{
                    current.playerIds.length === 2 ? 'Partenaire arrivé' : 'Place disponible'
                  }}</strong>
                  <p>{{ partnerCharacter() ? 'Personnage validé' : 'En attente' }}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
        <section class="panel world">
          <h3>{{ current.world.genre }}</h3>
          <p>
            {{ current.world.customDescription || 'Un univers libre façonné par vos décisions.' }}
          </p>
          <div class="tags">
            @for (tone of current.world.tone; track tone) {
              <span class="pill">{{ tone }}</span>
            }
            <span class="pill">{{
              current.playMode === 'realtime' ? 'Temps réel' : 'Mode libre'
            }}</span>
          </div>
        </section>
        <div class="actions">
          <a class="button" [routerLink]="['/aventure', current.id, 'personnage']">{{
            ownCharacter() ? 'Modifier mon personnage' : 'Créer mon personnage'
          }}</a>
          @if (current.status === 'active') {
            <a class="button secondary" [routerLink]="['/aventure', current.id, 'jouer']"
              >Entrer dans l’aventure</a
            >
          }
        </div>
      }
    </main>
  </div>`,
  styles: [
    `
      main {
        padding: 4vh 0;
      }
      .error {
        border-color: #874354;
      }
      .code {
        text-align: center;
      }
      .lobby-actions {
        display: flex;
        align-items: center;
        gap: 0.7rem;
      }
      .code strong {
        display: block;
        font: 600 clamp(2rem, 8vw, 4rem) 'Newsreader';
        letter-spacing: 0.1em;
        margin: 1rem;
      }
      .players {
        display: grid;
        gap: 1rem;
      }
      .players > div {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      .players p {
        margin: 0;
      }
      .avatar {
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: var(--accent);
        color: #07110e;
      }
      .secondary-avatar {
        background: var(--violet);
      }
      .world {
        margin-top: 1rem;
      }
      .tags,
      .actions {
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
      }
      .actions {
        margin: 1.2rem 0 4rem;
      }
    `,
  ],
})
export class LobbyPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly games = inject(GameService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly gameId = this.route.snapshot.paramMap.get('id')!;
  readonly game = signal<LocalAdventure | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly copied = signal(false);
  private refreshTimer: number | undefined;
  async ngOnInit() {
    await this.refresh();
    this.refreshTimer = window.setInterval(() => void this.refresh(false), 3_000);
  }
  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }
  private async refresh(showLoading = true): Promise<void> {
    if (showLoading) this.loading.set(true);
    try {
      await this.games.startIfReady(this.gameId);
      this.game.set(await this.games.load(this.gameId));
      this.error.set('');
    } catch (e) {
      if (this.games.isGameMissingError(e)) {
        if (this.refreshTimer) clearInterval(this.refreshTimer);
        await this.router.navigate(['/tableau-de-bord'], {
          state: dashboardNotificationState('adventure-deleted-by-other'),
        });
        return;
      }
      this.error.set(e instanceof Error ? e.message : 'Chargement impossible.');
    } finally {
      this.loading.set(false);
    }
  }
  async onGameDeleted(): Promise<void> {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    await this.router.navigate(['/tableau-de-bord'], {
      state: dashboardNotificationState('adventure-deleted'),
    });
  }
  ownCharacter() {
    return this.game()?.characters.some((c) => c.ownerId === this.auth.user()?.id) ?? false;
  }
  partnerCharacter() {
    return this.game()?.characters.some((c) => c.ownerId !== this.auth.user()?.id) ?? false;
  }
  async copy(code: string) {
    await navigator.clipboard.writeText(code);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
}
