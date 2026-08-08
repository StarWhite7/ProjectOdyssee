import { NgTemplateOutlet } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, computed, inject, signal } from '@angular/core';
import {
  InvitationsService,
  type InvitationDirection,
  type InvitationViewModel,
  type RecentCompanionViewModel,
} from '../core/invitations.service';

const INVITATIONS_PER_PAGE = 2;

@Component({
  selector: 'app-invitations-page',
  imports: [NgTemplateOutlet],
  template: `
    <section class="invitations-page" aria-labelledby="invitations-title">
      <header class="page-header">
        <h1 id="invitations-title">Invitations</h1>
        <p>Gérez vos invitations et retrouvez vos compagnons d'aventure.</p>
      </header>

      @if (loading()) {
        <div class="page-grid" aria-busy="true" aria-live="polite">
          <div class="main-column">
            <section class="section-panel">
              <h2>Invitations reçues</h2>
              <div class="card-list">
                @for (item of skeletonCards(); track item) {
                  <article class="invitation-card skeleton-card"></article>
                }
              </div>
            </section>
            <section class="section-panel">
              <h2>Invitations envoyées</h2>
              <div class="card-list">
                @for (item of skeletonCards(); track item) {
                  <article class="sent-card skeleton-card"></article>
                }
              </div>
            </section>
          </div>
          <aside class="companions-panel">
            <h2>Compagnons récents</h2>
            <article class="companion-skeleton skeleton-card"></article>
          </aside>
        </div>
      } @else if (error()) {
        <article class="error-panel" aria-live="assertive">
          <h2>Impossible de charger vos invitations pour le moment.</h2>
          <button type="button" (click)="retry()">Réessayer</button>
        </article>
      } @else {
        <div class="page-grid">
          <div class="main-column">
            <section class="section-panel" aria-labelledby="received-title">
              <div class="section-title-row">
                <h2 id="received-title">Invitations reçues</h2>
                @if (receivedInvitations().length) {
                  <span class="count-badge">{{ receivedInvitations().length }}</span>
                }
                <ng-container
                  [ngTemplateOutlet]="pager"
                  [ngTemplateOutletContext]="{
                    direction: 'received',
                    items: receivedInvitations(),
                  }"
                />
              </div>

              <div class="card-list">
                @for (invitation of visibleReceivedInvitations(); track invitation.id) {
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
                      <p>{{ invitation.otherUserName ?? 'Un joueur' }} vous invite à rejoindre</p>
                      <h3>{{ invitation.adventureTitle }}</h3>
                      @if (relativeDate(invitation.createdAt); as dateLabel) {
                        <span class="date-line">{{ dateLabel }}</span>
                      }
                    </div>
                    @if (invitation.canRespond) {
                      <div class="actions">
                        <button type="button" (click)="accept(invitation)">Accepter</button>
                        <button type="button" class="ghost" (click)="refuse(invitation)">
                          Refuser
                        </button>
                      </div>
                    }
                  </article>
                } @empty {
                  <article class="empty-state">
                    <h3>Aucune invitation reçue.</h3>
                    <p>Lorsqu'un joueur vous invitera à rejoindre une aventure, elle apparaîtra ici.</p>
                  </article>
                }
              </div>
            </section>

            <section class="section-panel" aria-labelledby="sent-title">
              <div class="section-title-row">
                <h2 id="sent-title">Invitations envoyées</h2>
                @if (sentInvitations().length) {
                  <span class="count-badge">{{ sentInvitations().length }}</span>
                }
                <ng-container
                  [ngTemplateOutlet]="pager"
                  [ngTemplateOutletContext]="{
                    direction: 'sent',
                    items: sentInvitations(),
                  }"
                />
              </div>

              <div class="card-list">
                @for (invitation of visibleSentInvitations(); track invitation.id) {
                  <article class="sent-card" [style.--cover]="background(invitation.coverImageUrl)">
                    <span class="avatar" aria-hidden="true">
                      @if (invitation.otherUserAvatarUrl) {
                        <img [src]="invitation.otherUserAvatarUrl" alt="" loading="lazy" />
                      } @else {
                        {{ userInitial(invitation.otherUserName) }}
                      }
                    </span>
                    <div class="invitation-copy">
                      <p>Invitation envoyée à {{ invitation.otherUserName ?? 'un joueur' }}</p>
                      <h3>{{ invitation.adventureTitle }}</h3>
                      @if (relativeDate(invitation.createdAt); as dateLabel) {
                        <span class="date-line">{{ dateLabel }}</span>
                      }
                    </div>
                    <span class="waiting-badge">En attente</span>
                  </article>
                } @empty {
                  <article class="empty-state">
                    <h3>Aucune invitation envoyée.</h3>
                  </article>
                }
              </div>
            </section>
          </div>

          <aside class="companions-panel" aria-labelledby="companions-title">
            <h2 id="companions-title">Compagnons récents</h2>
            <div class="companions-list">
              @for (companion of recentCompanions(); track companion.userId) {
                <article class="companion-row">
                  <span class="avatar small" aria-hidden="true">
                    @if (companion.avatarUrl) {
                      <img [src]="companion.avatarUrl" alt="" loading="lazy" />
                    } @else {
                      {{ userInitial(companion.displayName) }}
                    }
                  </span>
                  <div>
                    <h3>{{ companion.displayName }}</h3>
                    <p>Dernière aventure :</p>
                    <p class="adventure-link">{{ companion.lastAdventureTitle }}</p>
                  </div>
                </article>
              } @empty {
                <article class="empty-companions">
                  <h3>Aucun compagnon récent.</h3>
                </article>
              }
            </div>
          </aside>
        </div>
      }

      <ng-template #pager let-direction="direction" let-items="items">
        @if (pageCount(items) > 1) {
          <div class="pager" [attr.aria-label]="'Pagination ' + sectionLabel(direction)">
            <button
              type="button"
              class="pager-button"
              [disabled]="pageIndex(direction) === 0"
              (click)="changePage(direction, -1)"
            >
              Précédent
            </button>
            <span>{{ pageIndex(direction) + 1 }} / {{ pageCount(items) }}</span>
            <button
              type="button"
              class="pager-button"
              [disabled]="pageIndex(direction) >= pageCount(items) - 1"
              (click)="changePage(direction, 1)"
            >
              Suivant
            </button>
          </div>
        }
      </ng-template>
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
      padding: clamp(1.15rem, 2.5vh, 2.25rem) clamp(1.7rem, 3.2vw, 3.4rem)
        clamp(1rem, 2vh, 1.8rem);
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
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
      font: 600 clamp(2.15rem, 3.15vw, 3.8rem) / 0.95 'Newsreader', serif;
      letter-spacing: 0;
    }
    .page-header p {
      margin: clamp(0.35rem, 0.9vh, 0.7rem) 0 0;
      color: rgba(23, 36, 72, 0.84);
      font-size: clamp(0.92rem, 1.05vw, 1.12rem);
      line-height: 1.4;
    }
    .page-grid {
      min-height: 0;
      display: grid;
      grid-template-columns: minmax(0, 2.25fr) minmax(16.5rem, 0.8fr);
      gap: clamp(1.1rem, 2vw, 2.15rem);
      overflow: hidden;
    }
    .main-column {
      min-height: 0;
      display: grid;
      grid-template-rows: minmax(0, 1fr) minmax(0, 0.86fr);
      gap: clamp(0.9rem, 1.8vh, 1.35rem);
      overflow: hidden;
    }
    .section-panel {
      min-height: 0;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      gap: clamp(0.55rem, 1vh, 0.85rem);
      overflow: hidden;
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
      font: 600 clamp(1rem, 1.25vw, 1.32rem) / 1.05 'Newsreader', serif;
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
    .card-list {
      min-height: 0;
      display: grid;
      grid-template-rows: repeat(2, minmax(0, 1fr));
      gap: clamp(0.65rem, 1.25vh, 1rem);
      overflow: hidden;
    }
    .invitation-card,
    .sent-card,
    .empty-state,
    .companions-panel {
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 0.85rem;
      color: white;
      background: rgba(16, 27, 62, 0.34);
      backdrop-filter: blur(12px);
      box-shadow: 0 18px 45px rgba(15, 23, 56, 0.16);
      overflow: hidden;
    }
    .invitation-card,
    .sent-card {
      min-height: 0;
      padding: clamp(0.8rem, 1.45vh, 1.15rem);
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: clamp(0.75rem, 1.3vw, 1.1rem);
      background-image:
        linear-gradient(90deg, rgba(12, 20, 50, 0.72), rgba(22, 32, 66, 0.42)),
        var(--cover, url('/images/dashboard/DernierAventure.png'));
      background-size: cover;
      background-position: center;
    }
    .avatar {
      width: clamp(3.3rem, 5vw, 4.6rem);
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
      width: clamp(2.5rem, 3.4vw, 3.2rem);
    }
    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .invitation-copy {
      min-width: 0;
    }
    .invitation-copy p,
    .date-line,
    .companion-row p {
      margin: 0;
      color: rgba(255, 255, 255, 0.82);
      font-size: clamp(0.74rem, 0.88vw, 0.9rem);
      line-height: 1.35;
    }
    h3 {
      margin: 0.18rem 0;
      color: white;
      font: 600 clamp(1.1rem, 1.55vw, 1.55rem) / 1.05 'Newsreader', serif;
      letter-spacing: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .actions {
      display: grid;
      gap: 0.55rem;
    }
    button,
    .waiting-badge,
    .pager-button {
      border-radius: 999px;
      color: white;
      font-weight: 700;
    }
    .actions button,
    .waiting-badge {
      min-width: clamp(6.2rem, 8vw, 7.5rem);
      min-height: clamp(2.05rem, 3.5vh, 2.55rem);
      padding: 0.42rem 1rem;
      border: 0;
      background: linear-gradient(120deg, #7364df, #5145bd);
      box-shadow: 0 10px 25px rgba(45, 42, 126, 0.22);
    }
    .actions .ghost {
      border: 1px solid rgba(255, 255, 255, 0.36);
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(8px);
    }
    .waiting-badge {
      display: inline-grid;
      place-items: center;
      background: rgba(235, 183, 80, 0.9);
    }
    .empty-state {
      height: 100%;
      padding: 1rem;
      display: grid;
      align-content: center;
    }
    .empty-state h3,
    .empty-companions h3 {
      margin: 0;
      font-size: clamp(1rem, 1.2vw, 1.22rem);
    }
    .empty-state p {
      margin: 0.35rem 0 0;
      color: rgba(255, 255, 255, 0.74);
      line-height: 1.35;
    }
    .companions-panel {
      align-self: start;
      min-height: clamp(16rem, 41vh, 25rem);
      padding: clamp(1rem, 1.7vw, 1.45rem);
      background: rgba(255, 255, 255, 0.2);
    }
    .companions-list {
      display: grid;
      gap: clamp(0.85rem, 1.5vh, 1.25rem);
      margin-top: clamp(0.9rem, 1.8vh, 1.4rem);
    }
    .companion-row {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      gap: 0.8rem;
      color: #172448;
    }
    .companion-row h3 {
      color: #172448;
      font: 700 0.95rem / 1.15 'DM Sans', sans-serif;
    }
    .companion-row p {
      color: rgba(23, 36, 72, 0.78);
    }
    .adventure-link {
      color: #5145bd !important;
      font-weight: 700;
    }
    .empty-companions {
      padding: 1rem;
      border-radius: 0.8rem;
      color: white;
      background: rgba(16, 27, 62, 0.32);
    }
    .pager {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 0.45rem;
      color: rgba(23, 36, 72, 0.72);
      font-size: 0.72rem;
      font-weight: 700;
    }
    .pager-button {
      min-height: 1.8rem;
      padding: 0.22rem 0.65rem;
      border: 1px solid rgba(23, 36, 72, 0.12);
      background: rgba(255, 255, 255, 0.28);
      color: #1a2751;
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
      min-height: 2.3rem;
      margin-top: 1rem;
      padding: 0.45rem 1.1rem;
      border: 0;
      background: linear-gradient(120deg, #7364df, #5145bd);
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.42;
    }
    button:not(:disabled):hover {
      filter: brightness(1.06);
    }
    button:focus-visible {
      outline: 3px solid rgba(255, 255, 255, 0.9);
      outline-offset: 3px;
    }
    .skeleton-card {
      min-height: 100%;
      background:
        linear-gradient(90deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.08)),
        rgba(16, 27, 62, 0.36);
      background-size: 220% 100%;
    }
    .companion-skeleton {
      height: 10rem;
      border-radius: 0.8rem;
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
      .main-column {
        gap: 0.7rem;
      }
      .card-list {
        gap: 0.55rem;
      }
      .invitation-card,
      .sent-card {
        padding: 0.7rem;
      }
      .avatar {
        width: 3.1rem;
      }
      h3 {
        font-size: clamp(1rem, 1.35vw, 1.35rem);
      }
      .companions-panel {
        min-height: 14rem;
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
      .card-list {
        grid-template-columns: 1fr;
        grid-template-rows: none;
        overflow: visible;
      }
      .invitation-card,
      .sent-card {
        grid-template-columns: auto minmax(0, 1fr);
      }
      .actions,
      .waiting-badge {
        grid-column: 1 / -1;
        justify-self: start;
      }
    }
  `,
})
export class InvitationsPage implements OnInit {
  private readonly invitations = inject(InvitationsService);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly receivedInvitations = signal<InvitationViewModel[]>([]);
  readonly sentInvitations = signal<InvitationViewModel[]>([]);
  readonly recentCompanions = signal<RecentCompanionViewModel[]>([]);
  readonly receivedPage = signal(0);
  readonly sentPage = signal(0);
  readonly visibleReceivedInvitations = computed(() =>
    this.paginate(this.receivedInvitations(), this.receivedPage()),
  );
  readonly visibleSentInvitations = computed(() =>
    this.paginate(this.sentInvitations(), this.sentPage()),
  );

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async retry(): Promise<void> {
    await this.load();
  }

  async accept(invitation: InvitationViewModel): Promise<void> {
    await this.invitations.accept(invitation);
    await this.load();
  }

  async refuse(invitation: InvitationViewModel): Promise<void> {
    await this.invitations.refuse(invitation);
    await this.load();
  }

  changePage(direction: InvitationDirection, delta: -1 | 1): void {
    const items = direction === 'received' ? this.receivedInvitations() : this.sentInvitations();
    const next = Math.min(
      Math.max(this.pageIndex(direction) + delta, 0),
      this.pageCount(items) - 1,
    );
    this.pageSignal(direction).set(next);
  }

  pageIndex(direction: InvitationDirection): number {
    return this.pageSignal(direction)();
  }

  pageCount(items: InvitationViewModel[]): number {
    return Math.max(1, Math.ceil(items.length / INVITATIONS_PER_PAGE));
  }

  sectionLabel(direction: InvitationDirection): string {
    return direction === 'received' ? 'Invitations reçues' : 'Invitations envoyées';
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
    return "à l'instant";
  }

  protected skeletonCards(): number[] {
    return [0, 1];
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      const data = await this.invitations.load();
      this.receivedInvitations.set(data.received);
      this.sentInvitations.set(data.sent);
      this.recentCompanions.set(data.recentCompanions);
      this.receivedPage.set(0);
      this.sentPage.set(0);
    } catch (error) {
      console.error('Failed to load invitations', error);
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  private paginate(items: InvitationViewModel[], page: number): InvitationViewModel[] {
    const start = Math.min(page, this.pageCount(items) - 1) * INVITATIONS_PER_PAGE;
    return items.slice(start, start + INVITATIONS_PER_PAGE);
  }

  private pageSignal(direction: InvitationDirection) {
    return direction === 'received' ? this.receivedPage : this.sentPage;
  }
}
