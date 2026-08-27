import type { OnDestroy, OnInit } from '@angular/core';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { GameService } from '../core/game.service';
import type { LocalAdventure } from '../core/game.service';
import { InvitationsService, type FriendViewModel } from '../core/invitations.service';
import { dashboardNotificationState } from '../shared/dashboard-notification';
import { DeleteGameDialogComponent } from '../shared/delete-game-dialog.component';

type LobbyFriendInviteState = 'can_invite' | 'pending' | 'member' | 'unavailable';

type LobbyFriendViewModel = FriendViewModel & {
  inviteState: LobbyFriendInviteState;
};

@Component({
  selector: 'app-lobby',
  imports: [RouterLink, DeleteGameDialogComponent],
  template: `<div class="shell">
    <header class="topbar">
      <a class="brand" routerLink="/dashboard">Nerys</a>
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
        <div class="lobby-grid">
          <div class="lobby-main">
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
                {{
                  current.world.customDescription || 'Un univers libre façonné par vos décisions.'
                }}
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
          </div>
          <aside class="panel lobby-friends" aria-labelledby="lobby-friends-title">
            <div class="friends-head">
              <h3 id="lobby-friends-title">Compagnons</h3>
              @if (friendsLoading()) {
                <span class="pill">Chargement</span>
              }
            </div>
            @if (friendsError()) {
              <p class="friends-error">Impossible de charger vos compagnons.</p>
            } @else {
              <div class="friends-list">
                @for (friend of lobbyFriends(); track friend.userId) {
                  <article class="friend-row">
                    <span class="friend-avatar" aria-hidden="true">
                      @if (friend.avatarUrl) {
                        <img [src]="friend.avatarUrl" alt="" loading="lazy" />
                      } @else {
                        {{ friendInitial(friend.displayName) }}
                      }
                    </span>
                    <span>
                      <strong>{{ friend.displayName }}</strong>
                      <small>{{ friendInviteLabel(friend) }}</small>
                    </span>
                    @if (friend.inviteState === 'can_invite') {
                      <button
                        type="button"
                        [disabled]="invitingFriendId() === friend.userId"
                        (click)="inviteFriend(friend)"
                      >
                        {{ invitingFriendId() === friend.userId ? 'Envoi...' : 'Inviter' }}
                      </button>
                    } @else {
                      <button type="button" disabled>{{ friendInviteLabel(friend) }}</button>
                    }
                  </article>
                } @empty {
                  <p>Aucun compagnon disponible.</p>
                }
              </div>
            }
          </aside>
        </div>
        @if (friendsNotice()) {
          <p class="friends-notice" aria-live="polite">{{ friendsNotice() }}</p>
        }
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
      .lobby-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(18rem, 22rem);
        gap: 1rem;
        align-items: start;
      }
      .lobby-main {
        min-width: 0;
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
      .lobby-friends {
        max-height: min(34rem, 68vh);
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        gap: 0.8rem;
      }
      .friends-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
      }
      .friends-head h3,
      .lobby-friends p {
        margin: 0;
      }
      .friends-list {
        min-height: 0;
        display: grid;
        align-content: start;
        gap: 0.7rem;
        overflow: auto;
      }
      .friend-row {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 0.75rem;
        padding: 0.65rem;
        border: 1px solid var(--line);
        border-radius: 0.8rem;
        background: rgba(255, 255, 255, 0.04);
      }
      .friend-avatar {
        width: 2.4rem;
        height: 2.4rem;
        display: grid;
        place-items: center;
        border-radius: 50%;
        color: #07110e;
        background: var(--accent);
        overflow: hidden;
        font-weight: 700;
      }
      .friend-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .friend-row small {
        display: block;
        margin-top: 0.1rem;
        color: var(--muted);
      }
      .friend-row button {
        min-height: 2rem;
        padding: 0.4rem 0.8rem;
        white-space: nowrap;
      }
      .friends-error,
      .friends-notice {
        color: var(--muted);
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
      @media (max-width: 980px) {
        .lobby-grid {
          grid-template-columns: 1fr;
        }
        .lobby-friends {
          max-height: none;
        }
        .friends-list {
          overflow: visible;
        }
      }
    `,
  ],
})
export class LobbyPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly games = inject(GameService);
  private readonly invitations = inject(InvitationsService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly gameId = this.route.snapshot.paramMap.get('id')!;
  readonly game = signal<LocalAdventure | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly copied = signal(false);
  readonly lobbyFriends = signal<LobbyFriendViewModel[]>([]);
  readonly friendsLoading = signal(false);
  readonly friendsError = signal(false);
  readonly friendsNotice = signal('');
  readonly invitingFriendId = signal<string | null>(null);
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
      await this.refreshFriends(false);
      this.error.set('');
    } catch (e) {
      if (this.games.isGameMissingError(e)) {
        if (this.refreshTimer) clearInterval(this.refreshTimer);
        await this.router.navigate(['/dashboard'], {
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
    await this.router.navigate(['/dashboard'], {
      state: dashboardNotificationState('adventure-deleted'),
    });
  }
  ownCharacter() {
    return this.game()?.characters.some((c) => c.ownerId === this.auth.user()?.id) ?? false;
  }
  partnerCharacter() {
    return this.game()?.characters.some((c) => c.ownerId !== this.auth.user()?.id) ?? false;
  }
  async inviteFriend(friend: LobbyFriendViewModel): Promise<void> {
    if (friend.inviteState !== 'can_invite' || this.invitingFriendId()) return;
    this.invitingFriendId.set(friend.userId);
    this.friendsNotice.set('');
    try {
      await this.invitations.inviteFriendToGame(friend, this.gameId);
      this.lobbyFriends.update((friends) =>
        friends.map((item) =>
          item.userId === friend.userId ? { ...item, inviteState: 'pending' } : item,
        ),
      );
      this.friendsNotice.set('Invitation envoyée.');
    } catch (error) {
      console.error('Failed to invite friend from lobby', error);
      this.friendsNotice.set("L'invitation n'a pas pu être envoyée.");
      await this.refreshFriends(false);
    } finally {
      this.invitingFriendId.set(null);
    }
  }
  friendInviteLabel(friend: LobbyFriendViewModel): string {
    switch (friend.inviteState) {
      case 'pending':
        return 'Invitation envoyée';
      case 'member':
        return "Déjà dans l'aventure";
      case 'unavailable':
        return 'Indisponible';
      default:
        return 'Inviter';
    }
  }
  friendInitial(name: string): string {
    return name.trim().charAt(0).toLocaleUpperCase('fr-FR') || '?';
  }
  async copy(code: string) {
    await navigator.clipboard.writeText(code);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
  private async refreshFriends(showLoading = true): Promise<void> {
    if (showLoading) this.friendsLoading.set(true);
    this.friendsError.set(false);
    try {
      const data = await this.invitations.load();
      const game = this.game();
      const playerIds = new Set(game?.playerIds ?? []);
      const pendingFriendIds = new Set(
        data.sent
          .filter(
            (invitation) =>
              invitation.adventureId === this.gameId && invitation.status === 'pending',
          )
          .map((invitation) => invitation.otherUserId),
      );
      const invitableStatus = game
        ? ['waiting', 'character_creation', 'ready'].includes(game.status) && playerIds.size < 2
        : false;
      this.lobbyFriends.set(
        data.friends.map((friend) => ({
          ...friend,
          inviteState: this.friendInviteState(friend, playerIds, pendingFriendIds, invitableStatus),
        })),
      );
    } catch (error) {
      console.error('Failed to load lobby friends', error);
      this.friendsError.set(true);
      this.lobbyFriends.set([]);
    } finally {
      this.friendsLoading.set(false);
    }
  }
  private friendInviteState(
    friend: FriendViewModel,
    playerIds: Set<string>,
    pendingFriendIds: Set<string>,
    invitableStatus: boolean,
  ): LobbyFriendInviteState {
    if (playerIds.has(friend.userId)) return 'member';
    if (pendingFriendIds.has(friend.userId)) return 'pending';
    return invitableStatus ? 'can_invite' : 'unavailable';
  }
}
