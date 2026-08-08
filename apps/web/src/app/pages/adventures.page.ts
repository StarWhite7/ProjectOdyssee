import { Component, computed, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  MyAdventuresService,
  type MyAdventureGroup,
  type MyAdventureSort,
  type MyAdventureViewModel,
} from '../core/my-adventures.service';

const PAGE_SIZE: Record<MyAdventureGroup, number> = {
  active: 3,
  pending: 2,
  completed: 3,
};

@Component({
  selector: 'app-adventures-page',
  imports: [FormsModule, NgTemplateOutlet],
  template: `
    <section class="adventures-page" aria-labelledby="adventures-title">
      <header class="adventures-header">
        <div class="title-copy">
          <h1 id="adventures-title">Mes aventures</h1>
          <p>Retrouvez toutes vos aventures en cours, en attente et celles que vous avez déjà vécues.</p>
        </div>

        <div class="toolbar" aria-label="Recherche et tri des aventures">
          <label class="search-field">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m16.5 16.5 4 4" />
            </svg>
            <input
              type="search"
              [ngModel]="searchTerm()"
              (ngModelChange)="setSearchTerm($event)"
              placeholder="Rechercher une aventure..."
              aria-label="Rechercher une aventure"
              autocomplete="off"
            />
          </label>

          <label class="sort-field">
            <span>Trier par :</span>
            <select [ngModel]="sortOrder()" (ngModelChange)="setSortOrder($event)">
              <option value="recent">Plus récentes</option>
              <option value="oldest">Plus anciennes</option>
              <option value="alpha">Alphabétique</option>
            </select>
          </label>
        </div>
      </header>

      @if (loading()) {
        <div class="adventures-content" aria-busy="true" aria-live="polite">
          <section class="adventure-section active-section">
            <h2>En cours</h2>
            <div class="active-grid">
              @for (item of skeletonCards(3); track item) {
                <article class="adventure-card skeleton-card"></article>
              }
            </div>
          </section>
          <section class="adventure-section pending-section">
            <h2>En attente</h2>
            <div class="pending-grid">
              @for (item of skeletonCards(2); track item) {
                <article class="pending-card skeleton-card"></article>
              }
            </div>
          </section>
          <section class="adventure-section completed-section">
            <h2>Terminées</h2>
            <div class="completed-grid">
              @for (item of skeletonCards(3); track item) {
                <article class="completed-card skeleton-card"></article>
              }
            </div>
          </section>
        </div>
      } @else if (error()) {
        <article class="error-panel" aria-live="assertive">
          <h2>Impossible de charger vos aventures pour le moment.</h2>
          <button type="button" (click)="retry()">Réessayer</button>
        </article>
      } @else {
        <div class="adventures-content">
          <section class="adventure-section active-section" aria-labelledby="active-title">
            <div class="section-head">
              <h2 id="active-title">En cours</h2>
              <ng-container
                [ngTemplateOutlet]="pager"
                [ngTemplateOutletContext]="{ group: 'active', items: activeAdventures() }"
              />
            </div>
            <div class="active-grid">
              @for (adventure of visibleActiveAdventures(); track adventure.id) {
                <article class="adventure-card" [style.--cover]="background(adventure.coverImageUrl)">
                  <div class="card-copy">
                    <h3>{{ adventure.title }}</h3>
                    <div class="card-meta">
                      @if (adventure.companion; as companion) {
                        <span class="avatar" aria-hidden="true">
                          @if (companion.avatarUrl) {
                            <img [src]="companion.avatarUrl" alt="" loading="lazy" />
                          } @else {
                            {{ companionInitial(companion.name) }}
                          }
                        </span>
                        <span>Avec {{ companion.name }}</span>
                      }
                      @if (activityLabel(adventure.lastActivityAt); as activity) {
                        <span>{{ activity }}</span>
                      }
                    </div>
                  </div>
                  <button type="button" (click)="open(adventure)">Continuer</button>
                </article>
              } @empty {
                <article class="empty-state">
                  <h3>Aucune aventure en cours.</h3>
                  <p>Commencez une nouvelle histoire depuis votre tableau de bord.</p>
                </article>
              }
            </div>
          </section>

          <section class="adventure-section pending-section" aria-labelledby="pending-title">
            <div class="section-head">
              <h2 id="pending-title">En attente</h2>
              <ng-container
                [ngTemplateOutlet]="pager"
                [ngTemplateOutletContext]="{ group: 'pending', items: pendingAdventures() }"
              />
            </div>
            <div class="pending-grid">
              @for (adventure of visiblePendingAdventures(); track adventure.id) {
                <article class="pending-card" [style.--cover]="background(adventure.coverImageUrl)">
                  <div class="card-copy">
                    <h3>{{ adventure.title }}</h3>
                    <div class="card-meta">
                      @if (adventure.companion; as companion) {
                        <span class="avatar small" aria-hidden="true">
                          @if (companion.avatarUrl) {
                            <img [src]="companion.avatarUrl" alt="" loading="lazy" />
                          } @else {
                            {{ companionInitial(companion.name) }}
                          }
                        </span>
                        <span>Avec {{ companion.name }}</span>
                      }
                      <span>{{ adventure.statusLabel }}</span>
                    </div>
                  </div>
                  <span class="status-badge">{{ adventure.statusLabel }}</span>
                </article>
              } @empty {
                <article class="empty-state compact">
                  <h3>Aucune aventure en attente.</h3>
                </article>
              }
            </div>
          </section>

          <section class="adventure-section completed-section" aria-labelledby="completed-title">
            <div class="section-head">
              <h2 id="completed-title">Terminées</h2>
              <ng-container
                [ngTemplateOutlet]="pager"
                [ngTemplateOutletContext]="{ group: 'completed', items: completedAdventures() }"
              />
            </div>
            <div class="completed-grid">
              @for (adventure of visibleCompletedAdventures(); track adventure.id) {
                <article class="completed-card" [style.--cover]="background(adventure.coverImageUrl)">
                  <div class="card-copy">
                    <span class="check" aria-hidden="true">✓</span>
                    <h3>{{ adventure.title }}</h3>
                    <div class="card-meta">
                      @if (adventure.companion; as companion) {
                        <span class="avatar small" aria-hidden="true">
                          @if (companion.avatarUrl) {
                            <img [src]="companion.avatarUrl" alt="" loading="lazy" />
                          } @else {
                            {{ companionInitial(companion.name) }}
                          }
                        </span>
                        <span>Avec {{ companion.name }}</span>
                      }
                      @if (activityLabel(adventure.lastActivityAt); as activity) {
                        <span>{{ activity }}</span>
                      }
                    </div>
                  </div>
                  <button type="button" class="ghost-button" (click)="open(adventure)">
                    Consulter
                  </button>
                </article>
              } @empty {
                <article class="empty-state compact">
                  <h3>Aucune aventure terminée.</h3>
                </article>
              }
            </div>
          </section>
        </div>
      }

      <ng-template #pager let-group="group" let-items="items">
        @if (pageCount(items, group) > 1) {
          <div class="pager" [attr.aria-label]="'Pagination ' + sectionLabel(group)">
            <button
              type="button"
              class="pager-button"
              [disabled]="pageIndex(group) === 0"
              (click)="changePage(group, -1)"
            >
              Précédent
            </button>
            <span>{{ pageIndex(group) + 1 }} / {{ pageCount(items, group) }}</span>
            <button
              type="button"
              class="pager-button"
              [disabled]="pageIndex(group) >= pageCount(items, group) - 1"
              (click)="changePage(group, 1)"
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
    .adventures-page {
      height: 100%;
      min-height: 0;
      padding: clamp(1.15rem, 2.5vh, 2.25rem) clamp(1.7rem, 3.2vw, 3.4rem)
        clamp(1rem, 2vh, 1.8rem);
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      gap: clamp(0.8rem, 1.6vh, 1.3rem);
      overflow: hidden;
      color: #152247;
    }
    .adventures-header {
      min-height: 0;
      padding-bottom: clamp(0.75rem, 1.5vh, 1.2rem);
      border-bottom: 1px solid rgba(20, 31, 66, 0.13);
      display: grid;
      grid-template-columns: minmax(18rem, 1fr) minmax(26rem, 0.74fr);
      align-items: end;
      gap: clamp(1rem, 2vw, 2rem);
    }
    .title-copy h1 {
      margin: 0;
      color: #172448;
      font: 600 clamp(2.15rem, 3.15vw, 3.8rem) / 0.95 'Newsreader', serif;
      letter-spacing: 0;
    }
    .title-copy p {
      max-width: 34rem;
      margin: clamp(0.35rem, 0.9vh, 0.7rem) 0 0;
      color: rgba(23, 36, 72, 0.84);
      font-size: clamp(0.92rem, 1.05vw, 1.12rem);
      line-height: 1.45;
    }
    .toolbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) max-content;
      gap: 0.8rem;
      align-items: center;
    }
    .search-field,
    .sort-field {
      min-height: clamp(2.35rem, 4vh, 2.85rem);
      border: 1px solid rgba(255, 255, 255, 0.24);
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      color: rgba(21, 34, 71, 0.78);
      background: rgba(255, 255, 255, 0.34);
      backdrop-filter: blur(14px);
    }
    .search-field {
      gap: 0.6rem;
      padding: 0 0.9rem;
    }
    .search-field svg {
      width: 1.05rem;
      height: 1.05rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
    }
    input,
    select {
      border: 0;
      color: #1a2751;
      background: transparent;
      outline: 0;
      font: inherit;
    }
    input {
      width: 100%;
      min-width: 0;
    }
    input::placeholder {
      color: rgba(21, 34, 71, 0.58);
    }
    .sort-field {
      gap: 0.35rem;
      padding: 0 0.75rem 0 1rem;
      font-weight: 700;
      white-space: nowrap;
    }
    select {
      max-width: 9.5rem;
      font-weight: 700;
    }
    .adventures-content {
      min-height: 0;
      display: grid;
      grid-template-rows: minmax(0, 1.18fr) minmax(0, 0.7fr) minmax(0, 0.72fr);
      gap: clamp(0.75rem, 1.45vh, 1.25rem);
      overflow: hidden;
    }
    .adventure-section {
      min-height: 0;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      gap: clamp(0.45rem, 0.8vh, 0.65rem);
      overflow: hidden;
    }
    .section-head {
      min-height: 1.6rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    h2 {
      margin: 0;
      color: #172448;
      font: 600 clamp(1rem, 1.25vw, 1.3rem) / 1.05 'Newsreader', serif;
      letter-spacing: 0;
    }
    .active-grid,
    .pending-grid,
    .completed-grid {
      min-height: 0;
      display: grid;
      gap: clamp(0.75rem, 1.2vw, 1rem);
    }
    .active-grid,
    .completed-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .pending-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .adventure-card,
    .pending-card,
    .completed-card,
    .empty-state {
      min-height: 0;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 0.8rem;
      color: white;
      box-shadow: 0 18px 45px rgba(15, 23, 56, 0.2);
      overflow: hidden;
    }
    .adventure-card,
    .pending-card,
    .completed-card {
      position: relative;
      height: 100%;
      padding: clamp(0.8rem, 1.4vh, 1.25rem);
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1rem;
      background-image:
        linear-gradient(180deg, rgba(9, 16, 45, 0.08) 0%, rgba(9, 16, 45, 0.82) 100%),
        var(--cover);
      background-size: cover;
      background-position: center;
    }
    .pending-card {
      background-image:
        linear-gradient(90deg, rgba(9, 16, 45, 0.82), rgba(9, 16, 45, 0.42)),
        var(--cover);
    }
    .completed-card {
      background-image:
        linear-gradient(90deg, rgba(9, 16, 45, 0.78), rgba(9, 16, 45, 0.36)),
        var(--cover);
    }
    .card-copy {
      min-width: 0;
      max-width: min(100%, 30rem);
    }
    h3 {
      margin: 0;
      color: white;
      font: 600 clamp(1.05rem, 1.55vw, 1.65rem) / 1.05 'Newsreader', serif;
      letter-spacing: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-meta {
      min-height: 1.9rem;
      margin-top: clamp(0.45rem, 0.85vh, 0.7rem);
      display: flex;
      align-items: center;
      gap: 0.35rem 0.55rem;
      color: rgba(255, 255, 255, 0.82);
      font-size: clamp(0.72rem, 0.86vw, 0.9rem);
      line-height: 1.25;
    }
    .avatar {
      width: clamp(1.75rem, 2.2vw, 2.25rem);
      aspect-ratio: 1;
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 50%;
      display: inline-grid;
      place-items: center;
      color: white;
      background: rgba(255, 255, 255, 0.12);
      font-weight: 700;
    }
    .avatar.small {
      width: clamp(1.45rem, 1.9vw, 1.8rem);
    }
    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    button,
    .status-badge,
    .pager-button {
      border-radius: 999px;
      color: white;
      font-weight: 700;
    }
    .adventure-card > button,
    .ghost-button,
    .status-badge {
      flex: 0 0 auto;
      min-height: clamp(2rem, 3.4vh, 2.4rem);
      padding: 0.42rem clamp(0.95rem, 1.4vw, 1.35rem);
      border: 1px solid rgba(255, 255, 255, 0.24);
      background: linear-gradient(120deg, #7364df, #5145bd);
      box-shadow: 0 10px 25px rgba(45, 42, 126, 0.22);
    }
    .ghost-button {
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(8px);
    }
    .status-badge {
      background: rgba(235, 183, 80, 0.86);
    }
    .check {
      position: absolute;
      top: 0.7rem;
      left: 0.7rem;
      width: 1.2rem;
      aspect-ratio: 1;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: #48ca77;
      font-size: 0.8rem;
      font-weight: 800;
    }
    .empty-state {
      height: 100%;
      padding: 1rem;
      display: grid;
      align-content: center;
      background: rgba(16, 27, 62, 0.38);
      backdrop-filter: blur(12px);
    }
    .empty-state.compact {
      min-height: clamp(4.5rem, 9vh, 6.4rem);
    }
    .empty-state h3 {
      color: white;
      font-size: clamp(1rem, 1.2vw, 1.25rem);
    }
    .empty-state p {
      margin: 0.35rem 0 0;
      color: rgba(255, 255, 255, 0.76);
      line-height: 1.35;
    }
    .pager {
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
      background:
        linear-gradient(90deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.08)),
        rgba(16, 27, 62, 0.36);
      background-size: 220% 100%;
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
    @media (max-height: 820px) and (min-width: 981px) {
      .adventures-page {
        padding-block: 0.9rem 0.85rem;
        gap: 0.7rem;
      }
      .adventures-header {
        padding-bottom: 0.65rem;
      }
      .title-copy h1 {
        font-size: clamp(2rem, 3vw, 3.25rem);
      }
      .title-copy p {
        margin-top: 0.3rem;
        line-height: 1.32;
      }
      .adventures-content {
        grid-template-rows: minmax(0, 1.02fr) minmax(0, 0.62fr) minmax(0, 0.62fr);
        gap: 0.62rem;
      }
      .adventure-card,
      .pending-card,
      .completed-card {
        padding: 0.75rem;
      }
      h3 {
        font-size: clamp(1rem, 1.35vw, 1.35rem);
      }
      .card-meta {
        margin-top: 0.35rem;
      }
    }
    @media (max-width: 1180px) and (min-width: 981px) {
      .adventures-header {
        grid-template-columns: minmax(18rem, 1fr);
      }
      .toolbar {
        max-width: 44rem;
      }
    }
    @media (max-width: 980px) {
      .adventures-page {
        height: auto;
        min-height: 100svh;
        padding: 1rem;
        overflow: visible;
      }
      .adventures-header,
      .toolbar,
      .active-grid,
      .pending-grid,
      .completed-grid {
        grid-template-columns: 1fr;
      }
      .adventures-content,
      .adventure-section {
        overflow: visible;
        grid-template-rows: none;
      }
      .adventure-card,
      .pending-card,
      .completed-card {
        min-height: 10rem;
      }
    }
  `,
})
export class AdventuresPage implements OnInit {
  private readonly adventuresService = inject(MyAdventuresService);
  private readonly router = inject(Router);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly adventures = signal<MyAdventureViewModel[]>([]);
  readonly searchTerm = signal('');
  readonly sortOrder = signal<MyAdventureSort>('recent');
  readonly activePage = signal(0);
  readonly pendingPage = signal(0);
  readonly completedPage = signal(0);
  readonly filteredAdventures = computed(() =>
    this.adventuresService.filterAndSort(this.adventures(), this.searchTerm(), this.sortOrder()),
  );
  readonly activeAdventures = computed(() =>
    this.filteredAdventures().filter((adventure) => adventure.group === 'active'),
  );
  readonly pendingAdventures = computed(() =>
    this.filteredAdventures().filter((adventure) => adventure.group === 'pending'),
  );
  readonly completedAdventures = computed(() =>
    this.filteredAdventures().filter((adventure) => adventure.group === 'completed'),
  );
  readonly visibleActiveAdventures = computed(() =>
    this.paginate(this.activeAdventures(), 'active', this.activePage()),
  );
  readonly visiblePendingAdventures = computed(() =>
    this.paginate(this.pendingAdventures(), 'pending', this.pendingPage()),
  );
  readonly visibleCompletedAdventures = computed(() =>
    this.paginate(this.completedAdventures(), 'completed', this.completedPage()),
  );

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async retry(): Promise<void> {
    await this.load();
  }

  async open(adventure: MyAdventureViewModel): Promise<void> {
    await this.router.navigate(adventure.route);
  }

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.resetPages();
  }

  setSortOrder(value: MyAdventureSort): void {
    this.sortOrder.set(value);
    this.resetPages();
  }

  changePage(group: MyAdventureGroup, direction: -1 | 1): void {
    const items = this.itemsForGroup(group);
    const next = Math.min(
      Math.max(this.pageIndex(group) + direction, 0),
      this.pageCount(items, group) - 1,
    );
    this.pageSignal(group).set(next);
  }

  pageIndex(group: MyAdventureGroup): number {
    return this.pageSignal(group)();
  }

  pageCount(items: MyAdventureViewModel[], group: MyAdventureGroup): number {
    return Math.max(1, Math.ceil(items.length / PAGE_SIZE[group]));
  }

  sectionLabel(group: MyAdventureGroup): string {
    if (group === 'active') return 'En cours';
    if (group === 'pending') return 'En attente';
    return 'Terminées';
  }

  protected background(path: string): string {
    return `url("${path}")`;
  }

  protected companionInitial(name: string): string {
    return name.trim().charAt(0).toLocaleUpperCase('fr-FR');
  }

  protected activityLabel(value: string | null): string | null {
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

  protected skeletonCards(count: number): number[] {
    return Array.from({ length: count }, (_, index) => index);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      this.adventures.set(await this.adventuresService.load());
      this.resetPages();
    } catch (error) {
      console.error('Failed to load adventures', error);
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  private paginate(
    items: MyAdventureViewModel[],
    group: MyAdventureGroup,
    page: number,
  ): MyAdventureViewModel[] {
    const start = Math.min(page, this.pageCount(items, group) - 1) * PAGE_SIZE[group];
    return items.slice(start, start + PAGE_SIZE[group]);
  }

  private itemsForGroup(group: MyAdventureGroup): MyAdventureViewModel[] {
    if (group === 'active') return this.activeAdventures();
    if (group === 'pending') return this.pendingAdventures();
    return this.completedAdventures();
  }

  private pageSignal(group: MyAdventureGroup) {
    if (group === 'active') return this.activePage;
    if (group === 'pending') return this.pendingPage;
    return this.completedPage;
  }

  private resetPages(): void {
    this.activePage.set(0);
    this.pendingPage.set(0);
    this.completedPage.set(0);
  }
}
