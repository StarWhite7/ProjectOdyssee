import type { OnDestroy, OnInit } from '@angular/core';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { Character } from '@odyssee/domain';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from '../core/auth.service';
import { GameService } from '../core/game.service';
import type { LocalAdventure } from '../core/game.service';

@Component({
  selector: 'app-game',
  imports: [FormsModule, RouterLink],
  template: `<div class="shell">
    <header class="topbar">
      <a class="brand" routerLink="/tableau-de-bord">ODYSSÉE</a>
      <nav>
        <a [routerLink]="['/aventure', gameId, 'journal']">Journal</a
        ><a [routerLink]="['/aventure', gameId, 'souvenirs']">Souvenirs</a
        ><a [routerLink]="['/aventure', gameId, 'personnages']">Personnages</a>
      </nav>
      <span class="pill">{{ timerLabel() }}</span>
    </header>
    <main id="main">
      @if (loading()) {
        <section class="panel"><p>Le récit se rassemble…</p></section>
      } @else if (error()) {
        <section class="panel error">
          <h2>Impossible d’ouvrir l’aventure</h2>
          <p>{{ error() }}</p>
          <button (click)="reload()">Réessayer</button>
        </section>
      } @else if (game(); as current) {
        <section class="game-grid">
          <aside class="character panel">
            @if (me(); as character) {
              <p class="eyebrow">Votre personnage</p>
              <div class="avatar">{{ character.name[0] }}</div>
              <h3>{{ character.name }}</h3>
              <p>{{ character.personalityTraits.join(' · ') }}</p>
              <hr />
              <small>OBJECTIF PRIVÉ</small>
              <p class="goal">{{ myGoal() }}</p>
            }
          </aside>
          <article class="story panel">
            <div class="chapter">TOUR {{ turn()?.number }} · {{ current.title }}</div>
            <h2>{{ turn()?.location }}</h2>
            <p class="narration">{{ turn()?.scene }}</p>
            @if (previousResolution()) {
              <div class="resolution">
                <span>Conséquence précédente</span>
                <p>{{ previousResolution() }}</p>
              </div>
            }
          </article>
          <aside class="character panel partner">
            @if (partner(); as character) {
              <p class="eyebrow">Partenaire</p>
              <div class="avatar android">{{ character.name[0] }}</div>
              <h3>{{ character.name }}</h3>
              <p>{{ character.personalityTraits.join(' · ') }}</p>
              <hr />
              <small>PRÉSENCE</small>
              <p><span class="dot"></span> {{ partnerStatus() }}</p>
            } @else {
              <p class="eyebrow">Partenaire</p>
              <h3>En attente</h3>
              <p>Votre partenaire n’a pas encore validé son personnage.</p>
            }
          </aside>
        </section>
        <section class="decisions panel">
          <div>
            <p class="eyebrow">Votre décision reste secrète</p>
            <h3>Que fait {{ me()?.name }} ?</h3>
          </div>
          @if (alreadySubmitted()) {
            <div class="waiting">
              <div class="spinner"></div>
              <h3>Décision verrouillée</h3>
              <p>
                En attente de l’autre joueur. Son choix demeure invisible jusqu’à la résolution.
              </p>
            </div>
          } @else {
            <div class="choices">
              @for (suggestion of suggestions(); track suggestion.id) {
                <button
                  class="choice"
                  [class.selected]="selectedId() === suggestion.id"
                  (click)="choose(suggestion.id, suggestion.description)"
                >
                  <b>{{ suggestion.label }}</b
                  ><span>{{ suggestion.description }}</span>
                </button>
              }
            </div>
            <label class="field"
              >Ou écrivez librement votre action<textarea
                [(ngModel)]="freeAction"
                maxlength="1500"
                placeholder="Votre personnage décide de…"
                (input)="selectedId.set(null)"
              ></textarea>
            </label>
            <div class="submit-row">
              <span class="muted">{{ freeAction.length }} / 1500</span
              ><button
                (click)="submit()"
                [disabled]="submitting() || (!freeAction.trim() && !selectedAction())"
              >
                {{ submitting() ? 'Envoi…' : 'Valider en secret' }}
              </button>
            </div>
          }
          @if (message()) {
            <p class="notice" aria-live="polite">{{ message() }}</p>
          }
        </section>
      }
    </main>
  </div>`,
  styles: [
    `
      nav {
        display: flex;
        gap: 1rem;
        position: fixed;
        z-index: 10;
        bottom: 0;
        left: 0;
        right: 0;
        justify-content: space-around;
        padding: 0.9rem;
        background: #0b101cf2;
        border-top: 1px solid var(--line);
      }
      nav a {
        color: var(--muted);
        text-decoration: none;
      }
      .game-grid {
        display: grid;
        gap: 1rem;
      }
      .character {
        text-align: center;
      }
      .avatar {
        width: 74px;
        height: 74px;
        margin: 1rem auto;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: linear-gradient(145deg, #8ee8d2, #326f70);
        font: 600 2rem 'Newsreader';
        color: #07110e;
      }
      .android {
        background: linear-gradient(145deg, #aaa0ff, #4a3b87);
      }
      hr {
        border: 0;
        border-top: 1px solid var(--line);
        margin: 1.5rem 0;
      }
      .goal {
        color: #e7dfb5;
      }
      .story {
        min-height: 440px;
      }
      .chapter,
      small {
        color: var(--muted);
        font-size: 0.7rem;
        letter-spacing: 0.13em;
      }
      .narration {
        font:
          500 clamp(1.2rem, 2vw, 1.55rem)/1.75 'Newsreader',
          serif;
        color: #e9e7e2;
      }
      .resolution {
        border-left: 2px solid var(--accent);
        padding-left: 1rem;
      }
      .resolution span {
        color: var(--accent);
        font-size: 0.75rem;
        text-transform: uppercase;
      }
      .dot {
        display: inline-block;
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
        background: var(--accent);
        box-shadow: 0 0 12px var(--accent);
      }
      .decisions {
        margin: 1rem 0 4rem;
      }
      .choices {
        display: grid;
        gap: 0.7rem;
        margin: 1rem 0;
      }
      .choice {
        border-radius: 1rem;
        background: #0b101c;
        color: var(--ink);
        border: 1px solid var(--line);
        text-align: left;
        display: grid;
        justify-content: start;
      }
      .choice span {
        color: var(--muted);
        font-weight: 400;
      }
      .choice.selected {
        border-color: var(--accent);
        box-shadow: 0 0 0 1px var(--accent);
      }
      .submit-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 1rem;
      }
      .waiting {
        text-align: center;
        padding: 2rem;
      }
      .spinner {
        width: 34px;
        height: 34px;
        border: 3px solid var(--line);
        border-top-color: var(--accent);
        border-radius: 50%;
        margin: auto;
        animation: spin 1s linear infinite;
      }
      .notice {
        color: #ffb2ae;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      button:disabled {
        opacity: 0.55;
      }
      @media (min-width: 900px) {
        nav {
          position: static;
          padding: 0;
          background: transparent;
          border: 0;
        }
        .game-grid {
          grid-template-columns: 220px minmax(0, 1fr) 220px;
        }
        .choices {
          grid-template-columns: 1fr 1fr;
        }
      }
      @media (max-width: 899px) {
        .game-grid {
          grid-template-columns: 1fr 1fr;
        }
        .story {
          grid-column: 1/-1;
          grid-row: 1;
        }
        .character {
          padding: 1rem;
        }
        .avatar {
          width: 48px;
          height: 48px;
        }
        .character hr,
        .character small,
        .character .goal {
          display: none;
        }
      }
    `,
  ],
})
export class GamePage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly games = inject(GameService);
  private readonly auth = inject(AuthService);
  readonly gameId = this.route.snapshot.paramMap.get('id')!;
  readonly game = signal<LocalAdventure | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly message = signal('');
  readonly selectedId = signal<string | null>(null);
  readonly selectedAction = signal('');
  readonly submitting = signal(false);
  readonly isSubmissionStatusRefreshing = signal(false);
  readonly submittedPlayerIds = signal<ReadonlySet<string>>(new Set());
  readonly now = signal(Date.now());
  freeAction = '';
  private clockIntervalId: number | undefined;
  private submissionPollId: number | undefined;
  private submissionStatusTurnId: string | null = null;
  private submissionStatusRequest = 0;
  private destroyed = false;
  private timeoutSubmitting = false;
  private resolutionRetrying = false;
  private realtimeChannel: RealtimeChannel | null = null;
  readonly turn = computed(() => this.game()?.turns.at(-1));
  readonly me = computed<Character | undefined>(
    () =>
      this.game()?.characters.find((c) => c.ownerId === this.auth.user()?.id) ??
      this.game()?.characters[0],
  );
  readonly partner = computed<Character | undefined>(() =>
    this.game()?.characters.find((c) => c.id !== this.me()?.id),
  );
  readonly myGoal = computed(
    () =>
      this.game()?.goals.find((g) => g.characterId === this.me()?.id)?.description ??
      'Votre motivation émergera avec l’histoire.',
  );
  readonly suggestions = computed(() => this.turn()?.intentions[this.me()?.id ?? ''] ?? []);
  readonly alreadySubmitted = computed(() =>
    this.submittedPlayerIds().has(this.auth.user()?.id ?? ''),
  );
  readonly previousResolution = computed(() => this.game()?.turns.at(-2)?.resolution ?? null);
  readonly partnerStatus = computed(() =>
    this.submittedPlayerIds().has(this.partner()?.ownerId ?? '')
      ? 'Décision verrouillée'
      : 'En réflexion…',
  );
  readonly secondsRemaining = computed(() => {
    const current = this.game();
    const activeTurn = this.turn();
    if (!current || current.playMode !== 'realtime' || !current.timerSeconds || !activeTurn)
      return null;
    return Math.max(
      0,
      Math.ceil(
        (Date.parse(activeTurn.createdAt) + current.timerSeconds * 1000 - this.now()) / 1000,
      ),
    );
  });
  async ngOnInit() {
    await this.reload();
    const client = this.auth.supabase;
    if (client) {
      this.realtimeChannel = client
        .channel(`game:${this.gameId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'story_turns',
            filter: `game_id=eq.${this.gameId}`,
          },
          () => void this.reload(false),
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'player_decisions',
            filter: `game_id=eq.${this.gameId}`,
          },
          () => void this.reload(false),
        )
        .subscribe();
    }
    this.clockIntervalId = window.setInterval(() => {
      this.now.set(Date.now());
      if (this.secondsRemaining() === 0) void this.submitTimeout();
    }, 1_000);
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.submissionStatusRequest += 1;
    if (this.clockIntervalId) clearInterval(this.clockIntervalId);
    this.stopSubmissionStatusPolling();
    if (this.realtimeChannel) void this.auth.supabase?.removeChannel(this.realtimeChannel);
  }
  async reload(showLoading = true) {
    if (showLoading) this.loading.set(true);
    try {
      this.game.set(await this.games.load(this.gameId));
      await this.syncSubmissionStatusForCurrentTurn();
      this.error.set('');
      if (this.alreadySubmitted() && !this.resolutionRetrying) {
        this.resolutionRetrying = true;
        try {
          const status = await this.games.resolveCurrentTurn(this.gameId);
          if (status === 'resolved' || status === 'already_resolved') {
            this.game.set(await this.games.load(this.gameId));
            await this.syncSubmissionStatusForCurrentTurn();
          }
        } finally {
          this.resolutionRetrying = false;
        }
      }
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Chargement impossible.');
    } finally {
      this.loading.set(false);
    }
  }
  private async syncSubmissionStatusForCurrentTurn(): Promise<void> {
    const activeTurn = this.turn();
    if (!activeTurn) {
      this.stopSubmissionStatusPolling();
      this.submissionStatusTurnId = null;
      this.submittedPlayerIds.set(new Set());
      return;
    }
    if (this.submissionStatusTurnId !== activeTurn.id) {
      this.stopSubmissionStatusPolling();
      this.submissionStatusRequest += 1;
      this.submissionStatusTurnId = activeTurn.id;
      this.submittedPlayerIds.set(new Set());
    }
    await this.refreshSubmissionStatus(activeTurn.id);
    this.startSubmissionStatusPolling(activeTurn.id);
  }
  private startSubmissionStatusPolling(turnId: string): void {
    const partnerId = this.partner()?.ownerId;
    if (
      this.destroyed ||
      this.submissionPollId !== undefined ||
      this.submissionStatusTurnId !== turnId ||
      (partnerId !== undefined && this.submittedPlayerIds().has(partnerId))
    )
      return;
    this.submissionPollId = window.setInterval(() => void this.reload(false), 3_000);
  }
  private stopSubmissionStatusPolling(): void {
    if (this.submissionPollId !== undefined) {
      clearInterval(this.submissionPollId);
      this.submissionPollId = undefined;
    }
  }
  private async refreshSubmissionStatus(turnId: string): Promise<void> {
    const partnerId = this.partner()?.ownerId;
    if (
      this.destroyed ||
      this.submissionStatusTurnId !== turnId ||
      (partnerId !== undefined && this.submittedPlayerIds().has(partnerId))
    )
      return;
    const request = ++this.submissionStatusRequest;
    this.isSubmissionStatusRefreshing.set(true);
    try {
      const statuses = await this.games.getTurnSubmissionStatus(this.gameId, turnId);
      if (
        this.destroyed ||
        request !== this.submissionStatusRequest ||
        turnId !== this.submissionStatusTurnId ||
        turnId !== this.turn()?.id
      )
        return;
      const submitted = new Set(
        statuses.filter((status) => status.submitted).map((status) => status.playerId),
      );
      this.submittedPlayerIds.set(submitted);
      const currentPartnerId = this.partner()?.ownerId;
      if (currentPartnerId && submitted.has(currentPartnerId)) {
        this.stopSubmissionStatusPolling();
      }
    } catch (error) {
      if (
        !this.destroyed &&
        request === this.submissionStatusRequest &&
        turnId === this.submissionStatusTurnId &&
        turnId === this.turn()?.id
      )
        throw error;
    } finally {
      if (request === this.submissionStatusRequest) {
        this.isSubmissionStatusRefreshing.set(false);
      }
    }
  }
  timerLabel() {
    const current = this.game();
    if (!current) return '';
    if (current.playMode === 'asynchronous') return 'Mode libre';
    const seconds = this.secondsRemaining();
    if (seconds === null) return 'Temps réel';
    return `Temps réel · ${Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
  choose(id: string, action: string) {
    this.selectedId.set(id);
    this.selectedAction.set(action);
    this.freeAction = '';
  }
  async submit() {
    const action = this.freeAction.trim() || this.selectedAction();
    if (!action) return;
    this.submitting.set(true);
    this.message.set('');
    try {
      await this.games.submitDecision(
        this.gameId,
        action,
        this.freeAction.trim() ? 'freeform' : 'suggested',
        this.selectedId(),
      );
      this.markCurrentPlayerSubmitted();
      await this.reload(false);
      this.freeAction = '';
      this.selectedAction.set('');
      this.selectedId.set(null);
    } catch (e) {
      this.message.set(e instanceof Error ? e.message : 'Décision non envoyée.');
    } finally {
      this.submitting.set(false);
    }
  }
  private async submitTimeout(): Promise<void> {
    if (this.timeoutSubmitting || this.alreadySubmitted()) return;
    this.timeoutSubmitting = true;
    try {
      await this.games.submitDecision(
        this.gameId,
        'Le personnage hésite et observe la situation',
        'timeout',
        null,
      );
      this.markCurrentPlayerSubmitted();
      await this.reload(false);
    } catch {
      // The server-side expiration remains authoritative; another tab may have submitted first.
    } finally {
      this.timeoutSubmitting = false;
    }
  }
  private markCurrentPlayerSubmitted(): void {
    const playerId = this.auth.user()?.id;
    if (playerId) this.submittedPlayerIds.set(new Set([...this.submittedPlayerIds(), playerId]));
  }
}
