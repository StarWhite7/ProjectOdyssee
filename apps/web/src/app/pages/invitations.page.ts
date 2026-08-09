import type { OnDestroy, OnInit } from '@angular/core';
import { Component, computed, inject, signal } from '@angular/core';
import {
  InvitationsService,
  type AvailableAdventureViewModel,
  type BlockedUserViewModel,
  type FriendRequestViewModel,
  type FriendViewModel,
  type InvitationViewModel,
  type SocialSearchResultViewModel,
} from '../core/invitations.service';

@Component({
  selector: 'app-invitations-page',
  template: `
    <section class="invitations-page" aria-labelledby="invitations-title">
      <header class="page-header">
        <h1 id="invitations-title">Invitations</h1>
        <p>Gerez vos invitations et retrouvez vos compagnons d'aventure.</p>
      </header>

      @if (loading()) {
        <div class="page-grid" aria-busy="true" aria-live="polite">
          <div class="main-column">
            <article class="skeleton-card tall"></article>
            <article class="skeleton-card tall"></article>
            <article class="skeleton-card"></article>
          </div>
          <aside class="side-column">
            <article class="skeleton-card side"></article>
          </aside>
        </div>
      } @else if (error()) {
        <article class="error-panel" aria-live="assertive">
          <h2>Impossible de charger le social pour le moment.</h2>
          <button type="button" (click)="retry()">Reessayer</button>
        </article>
      } @else {
        <div class="page-grid">
          <div class="main-column">
            <section class="section-panel search-panel" aria-labelledby="search-title">
              <div>
                <h2 id="search-title">Trouver un compagnon</h2>
                <p>Recherchez un joueur par pseudo pour lui envoyer une demande d'ami.</p>
              </div>
              <label class="search-box">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  type="search"
                  placeholder="Rechercher un pseudo..."
                  [value]="searchQuery()"
                  (input)="onSearchInput($event)"
                />
              </label>
              @if (searchLoading()) {
                <p class="muted">Recherche en cours...</p>
              } @else if (searchResults().length) {
                <div class="compact-list">
                  @for (player of searchResults(); track player.userId) {
                    <article class="person-row">
                      <span class="avatar small" aria-hidden="true">
                        @if (player.avatarUrl) {
                          <img [src]="player.avatarUrl" alt="" loading="lazy" />
                        } @else {
                          {{ userInitial(player.displayName) }}
                        }
                      </span>
                      <div>
                        <h3>{{ player.displayName }}</h3>
                        <p>{{ relationLabel(player.relationStatus) }}</p>
                      </div>
                      <div class="inline-actions">
                        @if (player.relationStatus === 'none') {
                          <button
                            type="button"
                            [disabled]="isBusy(player.userId)"
                            (click)="sendFriendRequest(player)"
                          >
                            Ajouter
                          </button>
                        } @else if (player.relationStatus === 'friend') {
                          <button
                            type="button"
                            class="ghost danger"
                            [disabled]="isBusy(player.userId)"
                            (click)="blockUser(player.userId)"
                          >
                            Bloquer
                          </button>
                        }
                      </div>
                    </article>
                  }
                </div>
              } @else if (searchQuery().trim().length >= 2) {
                <p class="muted">Aucun joueur trouve.</p>
              }
            </section>

            <section class="section-panel" aria-labelledby="received-title">
              <div class="section-title-row">
                <h2 id="received-title">A traiter</h2>
                @if (pendingReceivedCount()) {
                  <span class="count-badge">{{ pendingReceivedCount() }}</span>
                }
              </div>
              <div class="card-list two-rows">
                @for (request of receivedFriendRequests(); track request.id) {
                  <article class="person-card">
                    <span class="avatar" aria-hidden="true">
                      @if (request.otherUserAvatarUrl) {
                        <img [src]="request.otherUserAvatarUrl" alt="" loading="lazy" />
                      } @else {
                        {{ userInitial(request.otherUserName) }}
                      }
                    </span>
                    <div class="invitation-copy">
                      <p>{{ request.otherUserName ?? 'Un joueur' }} veut devenir votre ami.</p>
                      @if (relativeDate(request.createdAt); as dateLabel) {
                        <span class="date-line">{{ dateLabel }}</span>
                      }
                    </div>
                    <div class="actions">
                      <button
                        type="button"
                        [disabled]="isBusy(request.id)"
                        (click)="acceptFriendRequest(request)"
                      >
                        Accepter
                      </button>
                      <button
                        type="button"
                        class="ghost"
                        [disabled]="isBusy(request.id)"
                        (click)="declineFriendRequest(request)"
                      >
                        Refuser
                      </button>
                    </div>
                  </article>
                }

                @for (invitation of receivedInvitations(); track invitation.id) {
                  <article
                    class="invitation-card"
                    [style.--cover]="background(invitation.coverImageUrl)"
                  >
                    <span class="avatar" aria-hidden="true">
                      @if (invitation.otherUserAvatarUrl) {
                        <img [src]="invitation.otherUserAvatarUrl" alt="" loading="lazy" />
                      } @else {
                        {{ userInitial(invitation.otherUserName) }}
                      }
                    </span>
                    <div class="invitation-copy">
                      <p>{{ invitation.otherUserName ?? 'Un joueur' }} vous invite a rejoindre</p>
                      <h3>{{ invitation.adventureTitle }}</h3>
                      @if (relativeDate(invitation.createdAt); as dateLabel) {
                        <span class="date-line">{{ dateLabel }}</span>
                      }
                    </div>
                    <div class="actions">
                      <button
                        type="button"
                        [disabled]="isBusy(invitation.id)"
                        (click)="accept(invitation)"
                      >
                        Accepter
                      </button>
                      <button
                        type="button"
                        class="ghost"
                        [disabled]="isBusy(invitation.id)"
                        (click)="refuse(invitation)"
                      >
                        Refuser
                      </button>
                    </div>
                  </article>
                } @empty {
                  @if (!receivedFriendRequests().length) {
                    <article class="empty-state">
                      <h3>Aucune invitation recue.</h3>
                      <p>Les demandes d'amis et invitations d'aventure apparaitront ici.</p>
                    </article>
                  }
                }
              </div>
            </section>

            <section class="section-panel" aria-labelledby="sent-title">
              <div class="section-title-row">
                <h2 id="sent-title">En attente</h2>
                @if (pendingSentCount()) {
                  <span class="count-badge">{{ pendingSentCount() }}</span>
                }
              </div>
              <div class="card-list">
                @for (request of sentFriendRequests(); track request.id) {
                  <article class="person-card compact">
                    <span class="avatar small" aria-hidden="true">
                      @if (request.otherUserAvatarUrl) {
                        <img [src]="request.otherUserAvatarUrl" alt="" loading="lazy" />
                      } @else {
                        {{ userInitial(request.otherUserName) }}
                      }
                    </span>
                    <div class="invitation-copy">
                      <p>Demande d'ami envoyee a {{ request.otherUserName ?? 'un joueur' }}</p>
                    </div>
                    <button
                      type="button"
                      class="ghost"
                      [disabled]="isBusy(request.id)"
                      (click)="cancelFriendRequest(request)"
                    >
                      Annuler
                    </button>
                  </article>
                }

                @for (invitation of sentInvitations(); track invitation.id) {
                  <article class="sent-card" [style.--cover]="background(invitation.coverImageUrl)">
                    <div class="invitation-copy">
                      <p>Invitation envoyee a {{ invitation.otherUserName ?? 'un joueur' }}</p>
                      <h3>{{ invitation.adventureTitle }}</h3>
                    </div>
                    <span class="waiting-badge">En attente</span>
                    <button
                      type="button"
                      class="ghost"
                      [disabled]="isBusy(invitation.id)"
                      (click)="cancelGameInvitation(invitation)"
                    >
                      Annuler
                    </button>
                  </article>
                } @empty {
                  @if (!sentFriendRequests().length) {
                    <article class="empty-state small-empty">
                      <h3>Aucune demande en attente.</h3>
                    </article>
                  }
                }
              </div>
            </section>
          </div>

          <aside class="side-column">
            <section class="companions-panel" aria-labelledby="companions-title">
              <div class="section-title-row">
                <h2 id="companions-title">Mes compagnons</h2>
                @if (friends().length) {
                  <span class="count-badge">{{ friends().length }}</span>
                }
              </div>
              <div class="companions-list">
                @for (friend of friends(); track friend.userId) {
                  <article class="companion-row">
                    <span class="avatar small" aria-hidden="true">
                      @if (friend.avatarUrl) {
                        <img [src]="friend.avatarUrl" alt="" loading="lazy" />
                      } @else {
                        {{ userInitial(friend.displayName) }}
                      }
                    </span>
                    <div class="friend-copy">
                      <h3>{{ friend.displayName }}</h3>
                      @if (availableAdventures().length) {
                        <label>
                          <span>Aventure</span>
                          <select
                            [value]="selectedAdventure(friend)"
                            (change)="selectAdventure(friend.userId, $event)"
                          >
                            @for (adventure of availableAdventures(); track adventure.id) {
                              <option [value]="adventure.id">{{ adventure.title }}</option>
                            }
                          </select>
                        </label>
                      } @else {
                        <p>Aucune aventure disponible.</p>
                      }
                    </div>
                    <div class="friend-actions">
                      <button
                        type="button"
                        [disabled]="!availableAdventures().length || isBusy(friend.userId)"
                        (click)="inviteFriend(friend)"
                      >
                        Inviter
                      </button>
                      <button
                        type="button"
                        class="ghost"
                        [disabled]="isBusy(friend.userId)"
                        (click)="removeFriend(friend)"
                      >
                        Retirer
                      </button>
                      <button
                        type="button"
                        class="ghost danger"
                        [disabled]="isBusy(friend.userId)"
                        (click)="blockUser(friend.userId)"
                      >
                        Bloquer
                      </button>
                    </div>
                  </article>
                } @empty {
                  <article class="empty-companions">
                    <h3>Aucun compagnon.</h3>
                    <p>Recherchez un joueur pour commencer votre cercle social.</p>
                  </article>
                }
              </div>
            </section>

            <section class="companions-panel blocked-panel" aria-labelledby="blocked-title">
              <div class="section-title-row">
                <h2 id="blocked-title">Bloques</h2>
                @if (blockedUsers().length) {
                  <span class="count-badge">{{ blockedUsers().length }}</span>
                }
              </div>
              <div class="companions-list compact-list">
                @for (blocked of blockedUsers(); track blocked.userId) {
                  <article class="blocked-row">
                    <span>{{ blocked.displayName }}</span>
                    <button
                      type="button"
                      class="ghost"
                      [disabled]="isBusy(blocked.userId)"
                      (click)="unblockUser(blocked)"
                    >
                      Debloquer
                    </button>
                  </article>
                } @empty {
                  <p class="muted">Aucun joueur bloque.</p>
                }
              </div>
            </section>
          </aside>
        </div>

        @if (notice(); as message) {
          <p class="notice" aria-live="polite">{{ message }}</p>
        }
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      min-height: 0;
    }
    .invitations-page {
      height: 100%;
      min-height: 0;
      padding: clamp(1.15rem, 2.5vh, 2.25rem) clamp(1.7rem, 3.2vw, 3.4rem) clamp(1rem, 2vh, 1.8rem);
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: clamp(0.9rem, 1.8vh, 1.35rem);
      overflow: hidden;
      color: #152247;
    }
    .page-header {
      padding-bottom: clamp(0.8rem, 1.6vh, 1.25rem);
      border-bottom: 1px solid rgba(20, 31, 66, 0.13);
    }
    h1 {
      margin: 0;
      color: #172448;
      font:
        600 clamp(2.15rem, 3.15vw, 3.8rem) / 0.95 'Newsreader',
        serif;
      letter-spacing: 0;
    }
    .page-header p,
    .search-panel p,
    .muted {
      margin: clamp(0.35rem, 0.9vh, 0.7rem) 0 0;
      color: rgba(23, 36, 72, 0.78);
      font-size: clamp(0.85rem, 0.95vw, 1rem);
      line-height: 1.4;
    }
    .page-grid {
      min-height: 0;
      display: grid;
      grid-template-columns: minmax(0, 2.25fr) minmax(18rem, 0.9fr);
      gap: clamp(1.1rem, 2vw, 2.15rem);
      overflow: hidden;
    }
    .main-column,
    .side-column {
      min-height: 0;
      display: grid;
      gap: clamp(0.9rem, 1.8vh, 1.35rem);
      overflow: hidden;
    }
    .main-column {
      grid-template-rows: auto minmax(0, 1fr) minmax(0, 0.75fr);
    }
    .side-column {
      grid-template-rows: minmax(0, 1fr) auto;
    }
    .section-panel,
    .companions-panel {
      min-height: 0;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 0.85rem;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(12px);
      box-shadow: 0 18px 45px rgba(15, 23, 56, 0.16);
      overflow: hidden;
    }
    .section-panel {
      padding: clamp(0.85rem, 1.4vw, 1.25rem);
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      gap: clamp(0.65rem, 1.1vh, 0.95rem);
    }
    .search-panel {
      grid-template-columns: minmax(12rem, 1fr) minmax(15rem, 1.1fr);
      grid-template-rows: auto auto;
      align-items: center;
    }
    .search-panel .compact-list,
    .search-panel .muted {
      grid-column: 1 / -1;
    }
    .section-title-row {
      min-height: 1.8rem;
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }
    h2 {
      margin: 0;
      color: #172448;
      font:
        600 clamp(1rem, 1.25vw, 1.32rem) / 1.05 'Newsreader',
        serif;
      letter-spacing: 0;
    }
    h3 {
      margin: 0.12rem 0;
      color: white;
      font:
        600 clamp(1rem, 1.25vw, 1.35rem) / 1.05 'Newsreader',
        serif;
      letter-spacing: 0;
    }
    .count-badge {
      min-width: 1.35rem;
      height: 1.35rem;
      padding: 0 0.35rem;
      border-radius: 999px;
      display: inline-grid;
      place-items: center;
      color: white;
      background: linear-gradient(120deg, #7364df, #5145bd);
      font-size: 0.72rem;
      font-weight: 700;
    }
    .search-box {
      min-height: 2.65rem;
      padding: 0 0.9rem;
      border: 1px solid rgba(23, 36, 72, 0.12);
      border-radius: 999px;
      display: grid;
      grid-template-columns: 1.1rem 1fr;
      align-items: center;
      gap: 0.65rem;
      background: rgba(255, 255, 255, 0.34);
      color: rgba(23, 36, 72, 0.72);
    }
    .search-box svg {
      width: 1.05rem;
      height: 1.05rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
    }
    input,
    select {
      min-width: 0;
      border: 0;
      color: #172448;
      background: transparent;
      font: inherit;
      outline: none;
    }
    select {
      width: 100%;
      min-height: 2rem;
      padding: 0 0.45rem;
      border: 1px solid rgba(23, 36, 72, 0.14);
      border-radius: 0.5rem;
      background: rgba(255, 255, 255, 0.32);
    }
    .card-list,
    .companions-list,
    .compact-list {
      min-height: 0;
      display: grid;
      gap: clamp(0.65rem, 1.25vh, 1rem);
      overflow: auto;
      padding-right: 0.2rem;
    }
    .two-rows {
      grid-auto-rows: minmax(8rem, auto);
    }
    .invitation-card,
    .sent-card,
    .person-card,
    .empty-state {
      min-height: 0;
      padding: clamp(0.8rem, 1.45vh, 1.15rem);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 0.85rem;
      color: white;
      background:
        linear-gradient(90deg, rgba(12, 20, 50, 0.76), rgba(22, 32, 66, 0.44)),
        rgba(16, 27, 62, 0.34);
      box-shadow: 0 18px 45px rgba(15, 23, 56, 0.16);
      overflow: hidden;
    }
    .invitation-card,
    .sent-card {
      background-image:
        linear-gradient(90deg, rgba(12, 20, 50, 0.78), rgba(22, 32, 66, 0.42)),
        var(--cover, url('/images/dashboard/DernierAventure.png'));
      background-size: cover;
      background-position: center;
    }
    .invitation-card,
    .person-card {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: clamp(0.75rem, 1.3vw, 1.1rem);
    }
    .sent-card,
    .person-card.compact {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      align-items: center;
      gap: 0.8rem;
    }
    .person-card.compact {
      grid-template-columns: auto minmax(0, 1fr) auto;
    }
    .avatar {
      width: clamp(3.15rem, 4.5vw, 4.25rem);
      aspect-ratio: 1;
      border: 1px solid rgba(255, 255, 255, 0.26);
      border-radius: 50%;
      display: inline-grid;
      place-items: center;
      color: white;
      background: rgba(255, 255, 255, 0.12);
      font-weight: 700;
      overflow: hidden;
    }
    .avatar.small {
      width: clamp(2.35rem, 3.2vw, 3rem);
    }
    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .invitation-copy,
    .friend-copy {
      min-width: 0;
    }
    .invitation-copy p,
    .date-line,
    .friend-copy p,
    .companion-row p {
      margin: 0;
      color: rgba(255, 255, 255, 0.82);
      font-size: clamp(0.74rem, 0.88vw, 0.9rem);
      line-height: 1.35;
    }
    .actions,
    .inline-actions,
    .friend-actions {
      display: grid;
      gap: 0.5rem;
    }
    button,
    .waiting-badge {
      min-height: 2.15rem;
      padding: 0.42rem 1rem;
      border: 0;
      border-radius: 999px;
      color: white;
      background: linear-gradient(120deg, #7364df, #5145bd);
      box-shadow: 0 10px 25px rgba(45, 42, 126, 0.22);
      font-weight: 700;
    }
    .ghost {
      border: 1px solid rgba(255, 255, 255, 0.36);
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(8px);
      box-shadow: none;
    }
    .danger {
      color: #fff0f3;
    }
    .waiting-badge {
      display: inline-grid;
      place-items: center;
      background: rgba(235, 183, 80, 0.9);
    }
    .empty-state {
      min-height: 7rem;
      display: grid;
      align-content: center;
    }
    .small-empty {
      min-height: 4.5rem;
    }
    .empty-state p,
    .empty-companions p {
      margin: 0.35rem 0 0;
      color: rgba(255, 255, 255, 0.74);
      line-height: 1.35;
    }
    .companions-panel {
      padding: clamp(1rem, 1.7vw, 1.45rem);
      color: #172448;
    }
    .companion-row {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: start;
      gap: 0.8rem;
      padding: 0.8rem;
      border-radius: 0.75rem;
      background: rgba(16, 27, 62, 0.2);
      color: white;
    }
    .companion-row .friend-actions {
      grid-column: 1 / -1;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .friend-copy label {
      display: grid;
      gap: 0.25rem;
      color: rgba(255, 255, 255, 0.75);
      font-size: 0.75rem;
      font-weight: 700;
    }
    .blocked-panel {
      max-height: 13rem;
    }
    .blocked-row,
    .person-row {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.75rem;
      padding: 0.7rem;
      border-radius: 0.75rem;
      background: rgba(16, 27, 62, 0.2);
      color: white;
    }
    .blocked-row {
      grid-template-columns: minmax(0, 1fr) auto;
    }
    .person-row h3 {
      font:
        700 0.95rem / 1.1 'DM Sans',
        sans-serif;
    }
    .person-row p {
      margin: 0;
      color: rgba(255, 255, 255, 0.72);
      font-size: 0.8rem;
    }
    .empty-companions {
      padding: 1rem;
      border-radius: 0.8rem;
      color: white;
      background: rgba(16, 27, 62, 0.32);
    }
    .notice {
      margin: 0;
      color: #172448;
      font-weight: 700;
    }
    .error-panel {
      align-self: start;
      padding: 1.2rem;
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 1rem;
      color: white;
      background: rgba(80, 24, 38, 0.62);
      backdrop-filter: blur(12px);
    }
    .error-panel h2 {
      color: white;
    }
    .error-panel button {
      margin-top: 1rem;
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.42;
    }
    button:not(:disabled):hover {
      filter: brightness(1.06);
    }
    button:focus-visible,
    input:focus-visible,
    select:focus-visible {
      outline: 3px solid rgba(255, 255, 255, 0.9);
      outline-offset: 3px;
    }
    .skeleton-card {
      min-height: 7rem;
      border-radius: 0.85rem;
      background:
        linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.08),
          rgba(255, 255, 255, 0.18),
          rgba(255, 255, 255, 0.08)
        ),
        rgba(16, 27, 62, 0.36);
      background-size: 220% 100%;
    }
    .skeleton-card.tall {
      min-height: 12rem;
    }
    .skeleton-card.side {
      min-height: 24rem;
    }
    @media (max-height: 820px) and (min-width: 981px) {
      .invitations-page {
        padding-block: 0.9rem 0.85rem;
        gap: 0.7rem;
      }
      .page-header {
        padding-bottom: 0.65rem;
      }
      h1 {
        font-size: clamp(2rem, 3vw, 3.25rem);
      }
      .main-column,
      .side-column {
        gap: 0.7rem;
      }
      .section-panel,
      .companions-panel {
        padding: 0.8rem;
      }
    }
    @media (max-width: 980px) {
      .invitations-page {
        height: auto;
        min-height: 100svh;
        padding: 1rem;
        overflow: visible;
      }
      .page-grid,
      .main-column,
      .side-column,
      .search-panel {
        grid-template-columns: 1fr;
        grid-template-rows: none;
        overflow: visible;
      }
      .card-list,
      .companions-list,
      .compact-list {
        overflow: visible;
      }
      .invitation-card,
      .person-card,
      .sent-card {
        grid-template-columns: auto minmax(0, 1fr);
      }
      .actions,
      .waiting-badge,
      .sent-card > .ghost {
        grid-column: 1 / -1;
        justify-self: start;
      }
    }
  `,
})
export class InvitationsPage implements OnInit, OnDestroy {
  private readonly invitations = inject(InvitationsService);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly notice = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly searchLoading = signal(false);
  readonly searchResults = signal<SocialSearchResultViewModel[]>([]);
  readonly receivedInvitations = signal<InvitationViewModel[]>([]);
  readonly sentInvitations = signal<InvitationViewModel[]>([]);
  readonly receivedFriendRequests = signal<FriendRequestViewModel[]>([]);
  readonly sentFriendRequests = signal<FriendRequestViewModel[]>([]);
  readonly friends = signal<FriendViewModel[]>([]);
  readonly blockedUsers = signal<BlockedUserViewModel[]>([]);
  readonly availableAdventures = signal<AvailableAdventureViewModel[]>([]);
  readonly selectedAdventures = signal<Record<string, string>>({});
  readonly busyAction = signal<string | null>(null);
  readonly pendingReceivedCount = computed(
    () => this.receivedFriendRequests().length + this.receivedInvitations().length,
  );
  readonly pendingSentCount = computed(
    () => this.sentFriendRequests().length + this.sentInvitations().length,
  );

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  async retry(): Promise<void> {
    await this.load();
  }

  onSearchInput(event: Event): void {
    const input = event.target instanceof HTMLInputElement ? event.target.value : '';
    this.searchQuery.set(input);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.searchPlayers(), 250);
  }

  async sendFriendRequest(player: SocialSearchResultViewModel): Promise<void> {
    await this.runAction(player.userId, async () => {
      await this.invitations.sendFriendRequest(player.userId);
      this.notice.set('Demande envoyee.');
      await this.load(false);
      await this.searchPlayers();
    });
  }

  async acceptFriendRequest(request: FriendRequestViewModel): Promise<void> {
    await this.runAction(request.id, async () => {
      await this.invitations.acceptFriendRequest(request);
      this.notice.set('Demande acceptee.');
      await this.load(false);
    });
  }

  async declineFriendRequest(request: FriendRequestViewModel): Promise<void> {
    await this.runAction(request.id, async () => {
      await this.invitations.declineFriendRequest(request);
      this.notice.set('Demande refusee.');
      await this.load(false);
    });
  }

  async cancelFriendRequest(request: FriendRequestViewModel): Promise<void> {
    await this.runAction(request.id, async () => {
      await this.invitations.cancelFriendRequest(request);
      this.notice.set('Demande annulee.');
      await this.load(false);
    });
  }

  async accept(invitation: InvitationViewModel): Promise<void> {
    await this.runAction(invitation.id, async () => {
      await this.invitations.accept(invitation);
      this.notice.set('Invitation acceptee.');
      await this.load(false);
    });
  }

  async refuse(invitation: InvitationViewModel): Promise<void> {
    await this.runAction(invitation.id, async () => {
      await this.invitations.refuse(invitation);
      this.notice.set('Invitation refusee.');
      await this.load(false);
    });
  }

  async cancelGameInvitation(invitation: InvitationViewModel): Promise<void> {
    await this.runAction(invitation.id, async () => {
      await this.invitations.cancelGameInvitation(invitation);
      this.notice.set('Invitation annulee.');
      await this.load(false);
    });
  }

  async inviteFriend(friend: FriendViewModel): Promise<void> {
    const adventureId = this.selectedAdventure(friend);
    if (!adventureId) return;
    await this.runAction(friend.userId, async () => {
      await this.invitations.inviteFriendToGame(friend, adventureId);
      this.notice.set('Invitation d aventure envoyee.');
      await this.load(false);
    });
  }

  async removeFriend(friend: FriendViewModel): Promise<void> {
    await this.runAction(friend.userId, async () => {
      await this.invitations.removeFriend(friend);
      this.notice.set('Compagnon retire.');
      await this.load(false);
    });
  }

  async blockUser(userId: string): Promise<void> {
    await this.runAction(userId, async () => {
      await this.invitations.blockUser(userId);
      this.notice.set('Joueur bloque.');
      await this.load(false);
      await this.searchPlayers();
    });
  }

  async unblockUser(blocked: BlockedUserViewModel): Promise<void> {
    await this.runAction(blocked.userId, async () => {
      await this.invitations.unblockUser(blocked.userId);
      this.notice.set('Joueur debloque.');
      await this.load(false);
    });
  }

  selectAdventure(friendId: string, event: Event): void {
    const select = event.target instanceof HTMLSelectElement ? event.target : null;
    if (!select) return;
    this.selectedAdventures.update((current) => ({ ...current, [friendId]: select.value }));
  }

  selectedAdventure(friend: FriendViewModel): string {
    return this.selectedAdventures()[friend.userId] ?? this.availableAdventures()[0]?.id ?? '';
  }

  isBusy(id: string): boolean {
    return this.busyAction() === id;
  }

  relationLabel(status: SocialSearchResultViewModel['relationStatus']): string {
    switch (status) {
      case 'friend':
        return 'Deja dans vos compagnons';
      case 'request_sent':
        return 'Demande deja envoyee';
      case 'request_received':
        return 'Demande recue en attente';
      case 'blocked':
      case 'blocked_by_them':
        return 'Interaction bloquee';
      default:
        return 'Joueur disponible';
    }
  }

  protected background(path: string): string {
    return `url("${path}")`;
  }

  protected userInitial(name: string | null): string {
    return (name?.trim().charAt(0) || '?').toLocaleUpperCase('fr-FR');
  }

  protected relativeDate(value: string | null): string | null {
    if (!value) return null;
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) return null;
    const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
    const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
      ['year', 31_536_000],
      ['month', 2_592_000],
      ['week', 604_800],
      ['day', 86_400],
      ['hour', 3_600],
      ['minute', 60],
    ];
    const formatter = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });
    for (const [unit, seconds] of units) {
      if (Math.abs(diffSeconds) >= seconds) {
        return formatter.format(Math.round(diffSeconds / seconds), unit);
      }
    }
    return "a l'instant";
  }

  private async load(showSpinner = true): Promise<void> {
    if (showSpinner) this.loading.set(true);
    this.error.set(false);
    try {
      const data = await this.invitations.load();
      this.receivedInvitations.set(data.received);
      this.sentInvitations.set(data.sent);
      this.receivedFriendRequests.set(data.receivedFriendRequests);
      this.sentFriendRequests.set(data.sentFriendRequests);
      this.friends.set(data.friends);
      this.blockedUsers.set(data.blockedUsers);
      this.availableAdventures.set(data.availableAdventures);
      this.selectedAdventures.update((current) => this.normalizeSelections(current));
    } catch (error) {
      console.error('Failed to load social page', error);
      this.error.set(true);
    } finally {
      if (showSpinner) this.loading.set(false);
    }
  }

  private async searchPlayers(): Promise<void> {
    const query = this.searchQuery().trim();
    if (query.length < 2) {
      this.searchResults.set([]);
      return;
    }
    this.searchLoading.set(true);
    try {
      this.searchResults.set(await this.invitations.searchPlayers(query));
    } catch (error) {
      console.error('Failed to search players', error);
      this.searchResults.set([]);
    } finally {
      this.searchLoading.set(false);
    }
  }

  private async runAction(id: string, action: () => Promise<void>): Promise<void> {
    this.busyAction.set(id);
    this.notice.set(null);
    try {
      await action();
    } catch (error) {
      console.error('Social action failed', error);
      this.notice.set("L'action n'a pas pu aboutir.");
    } finally {
      this.busyAction.set(null);
    }
  }

  private normalizeSelections(current: Record<string, string>): Record<string, string> {
    const availableIds = new Set(this.availableAdventures().map((adventure) => adventure.id));
    const next: Record<string, string> = {};
    for (const friend of this.friends()) {
      const selected = current[friend.userId];
      next[friend.userId] =
        selected && availableIds.has(selected) ? selected : this.selectedAdventure(friend);
    }
    return next;
  }
}
