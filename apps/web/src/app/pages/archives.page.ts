import type { OnInit } from '@angular/core';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ArchivesService,
  type ArchiveFilter,
  type ArchiveSort,
  type ArchiveViewModel,
} from '../core/archives.service';

const PAGE_SIZE = 6;

@Component({
  selector: 'app-archives-page',
  imports: [FormsModule],
  template: `
    <section class="archives-page" [class.has-tabs]="showStatusTabs()" aria-labelledby="archives-title">
      <header class="archives-header">
        <div class="title-copy">
          <h1 id="archives-title">Archives</h1>
          <p>
            Revivez les histoires que vous avez écrites.<br />
            Chaque aventure est une trace de votre odyssée.
          </p>
        </div>

        <div class="toolbar" aria-label="Recherche et tri des archives">
          <label class="search-field">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m16.5 16.5 4 4" />
            </svg>
            <input
              type="search"
              [ngModel]="searchTerm()"
              (ngModelChange)="setSearchTerm($event)"
              placeholder="Rechercher dans mes archives..."
              aria-label="Rechercher dans mes archives"
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

      @if (showStatusTabs()) {
        <nav class="filter-tabs" aria-label="Filtres des archives">
          <button
            type="button"
            [class.active]="filter() === 'all'"
            [attr.aria-pressed]="filter() === 'all'"
            (click)="setFilter('all')"
          >
            Toutes
          </button>
          <button
            type="button"
            [class.active]="filter() === 'completed'"
            [attr.aria-pressed]="filter() === 'completed'"
            (click)="setFilter('completed')"
          >
            Terminées
          </button>
        </nav>
      }

      @if (loading()) {
        <div class="archives-grid" aria-busy="true" aria-live="polite">
          @for (item of skeletonCards(); track item) {
            <article class="archive-card skeleton-card"></article>
          }
        </div>
      } @else if (error()) {
        <article class="error-panel" aria-live="assertive">
          <h2>Impossible de charger vos archives pour le moment.</h2>
          <button type="button" (click)="retry()">Réessayer</button>
        </article>
      } @else {
        <div class="archives-body">
          @if (visibleArchives().length) {
            <div class="archives-grid">
              @for (archive of visibleArchives(); track archive.id) {
                <article class="archive-card" [style.--cover]="background(archive.coverImageUrl)">
                  <div class="card-copy">
                    <h2>{{ archive.title }}</h2>
                    <div class="companion-row">
                      @if (archive.companion; as companion) {
                        <span class="avatar" aria-hidden="true">
                          @if (companion.avatarUrl) {
                            <img [src]="companion.avatarUrl" alt="" loading="lazy" />
                          } @else {
                            {{ companionInitial(companion.name) }}
                          }
                        </span>
                        <span>Avec {{ companion.name }}</span>
                      }
                    </div>
                    <p class="finished-label">{{ finishedLabel(archive.completedAt) }}</p>
                    <div class="metrics" aria-label="Métriques de l'archive">
                      @if (chapterLabel(archive.chapterCount); as chapters) {
                        <span>
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <rect x="5" y="4" width="14" height="16" rx="2" />
                            <path d="M9 8h6M9 12h6M9 16h4" />
                          </svg>
                          {{ chapters }}
                        </span>
                      }
                      @if (durationLabel(archive); as duration) {
                        <span>
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="12" cy="12" r="8" />
                            <path d="M12 8v5l3 2" />
                          </svg>
                          {{ duration }}
                        </span>
                      }
                    </div>
                  </div>
                  <button type="button" (click)="open(archive)">Consulter</button>
                </article>
              }
            </div>
          } @else {
            <article class="empty-panel">
              <h2>{{ emptyTitle() }}</h2>
              <p>{{ emptyDescription() }}</p>
            </article>
          }

          <footer class="archives-footer">
            @if (pageCount() > 1) {
              <div class="pager" aria-label="Pagination des archives">
                <button type="button" [disabled]="safePageIndex() === 0" (click)="changePage(-1)">
                  Précédent
                </button>
                <span>{{ safePageIndex() + 1 }} / {{ pageCount() }}</span>
                <button
                  type="button"
                  [disabled]="safePageIndex() >= pageCount() - 1"
                  (click)="changePage(1)"
                >
                  Suivant
                </button>
              </div>
            }
            <p>Chaque histoire est unique. Et la vôtre ne fait que commencer.</p>
          </footer>
        </div>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      min-height: 0;
    }
    .archives-page {
      height: 100%;
      min-height: 0;
      padding: clamp(1.15rem, 2.5vh, 2.25rem) clamp(1.7rem, 3.2vw, 3.4rem)
        clamp(0.9rem, 1.8vh, 1.65rem);
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      gap: clamp(0.7rem, 1.35vh, 1.15rem);
      overflow: hidden;
      color: #172448;
    }
    .archives-page.has-tabs {
      grid-template-rows: auto auto minmax(0, 1fr);
    }
    .archives-header {
      min-height: 0;
      padding-bottom: clamp(0.75rem, 1.5vh, 1.2rem);
      border-bottom: 1px solid rgba(20, 31, 66, 0.13);
      display: grid;
      grid-template-columns: minmax(18rem, 1fr) minmax(26rem, 0.78fr);
      align-items: end;
      gap: clamp(1rem, 2vw, 2rem);
    }
    .title-copy h1 {
      margin: 0;
      color: #172448;
      font: 600 clamp(2.25rem, 3.25vw, 3.85rem) / 0.95 'Newsreader', serif;
      letter-spacing: 0;
    }
    .title-copy p {
      max-width: 36rem;
      margin: clamp(0.4rem, 0.9vh, 0.72rem) 0 0;
      color: rgba(23, 36, 72, 0.84);
      font-size: clamp(0.92rem, 1.05vw, 1.12rem);
      line-height: 1.48;
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
    .filter-tabs {
      display: flex;
      align-items: center;
      gap: clamp(1.2rem, 3vw, 2.5rem);
    }
    .filter-tabs button {
      position: relative;
      min-height: 2rem;
      padding: 0 0 0.45rem;
      border: 0;
      color: rgba(23, 36, 72, 0.72);
      background: transparent;
      font: 700 clamp(0.9rem, 1vw, 1rem) / 1 'DM Sans', sans-serif;
    }
    .filter-tabs button.active {
      color: #172448;
    }
    .filter-tabs button.active::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 2px;
      border-radius: 999px;
      background: #7364df;
    }
    .archives-body {
      min-height: 0;
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      gap: clamp(0.55rem, 1.1vh, 0.9rem);
      overflow: hidden;
    }
    .archives-grid {
      min-height: 0;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      grid-template-rows: repeat(2, minmax(0, 1fr));
      gap: clamp(0.75rem, 1.2vw, 1.15rem);
      overflow: hidden;
    }
    .archive-card,
    .empty-panel,
    .error-panel {
      min-height: 0;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 0.8rem;
      color: white;
      box-shadow: 0 18px 45px rgba(15, 23, 56, 0.2);
      overflow: hidden;
    }
    .archive-card {
      position: relative;
      height: 100%;
      padding: clamp(0.85rem, 1.5vh, 1.25rem);
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1rem;
      background-image:
        linear-gradient(180deg, rgba(9, 16, 45, 0.1) 0%, rgba(9, 16, 45, 0.83) 100%),
        var(--cover);
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }
    .archive-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, rgba(9, 16, 45, 0.3), transparent 62%);
      pointer-events: none;
    }
    .card-copy,
    .archive-card > button {
      position: relative;
      z-index: 1;
    }
    .card-copy {
      min-width: 0;
      max-width: min(100%, 30rem);
    }
    h2 {
      margin: 0;
      color: white;
      font: 600 clamp(1.25rem, 1.65vw, 1.85rem) / 1.05 'Newsreader', serif;
      letter-spacing: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .companion-row,
    .metrics {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.35rem 0.55rem;
      color: rgba(255, 255, 255, 0.84);
      font-size: clamp(0.74rem, 0.86vw, 0.9rem);
      line-height: 1.25;
    }
    .companion-row {
      min-height: 1.75rem;
      margin-top: clamp(0.45rem, 0.75vh, 0.65rem);
      font-weight: 700;
    }
    .avatar {
      width: clamp(1.65rem, 2vw, 2rem);
      aspect-ratio: 1;
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 50%;
      display: inline-grid;
      place-items: center;
      color: white;
      background: rgba(255, 255, 255, 0.12);
      font-weight: 800;
      overflow: hidden;
    }
    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .finished-label {
      min-height: 1.2rem;
      margin: clamp(0.2rem, 0.5vh, 0.35rem) 0 0;
      color: rgba(255, 255, 255, 0.82);
      font-size: clamp(0.72rem, 0.82vw, 0.88rem);
    }
    .metrics {
      margin-top: clamp(0.45rem, 0.8vh, 0.75rem);
      color: rgba(255, 255, 255, 0.78);
    }
    .metrics span {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }
    .metrics svg {
      width: 0.95rem;
      height: 0.95rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
    }
    .archive-card > button,
    .pager button,
    .error-panel button {
      flex: 0 0 auto;
      min-height: clamp(2rem, 3.4vh, 2.4rem);
      padding: 0.42rem clamp(0.95rem, 1.4vw, 1.35rem);
      border: 1px solid rgba(255, 255, 255, 0.28);
      border-radius: 999px;
      color: white;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(8px);
      font-weight: 800;
    }
    .archive-card > button:hover,
    .pager button:not(:disabled):hover,
    .error-panel button:hover {
      background: rgba(116, 96, 223, 0.64);
    }
    .empty-panel,
    .error-panel {
      height: 100%;
      padding: clamp(1.2rem, 2.4vh, 2rem);
      display: grid;
      align-content: center;
      background:
        linear-gradient(90deg, rgba(9, 16, 45, 0.78), rgba(9, 16, 45, 0.4)),
        url('/images/dashboard/DernierAventure.png') center / cover no-repeat;
    }
    .empty-panel h2,
    .error-panel h2 {
      color: white;
      font: 600 clamp(1.4rem, 2vw, 2.2rem) / 1.05 'Newsreader', serif;
    }
    .empty-panel p {
      max-width: 28rem;
      margin: 0.55rem 0 0;
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.45;
    }
    .error-panel button {
      justify-self: start;
      margin-top: 1rem;
      background: linear-gradient(120deg, #7364df, #5145bd);
    }
    .archives-footer {
      min-height: 2.1rem;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 1rem;
      color: rgba(255, 255, 255, 0.74);
      font-size: clamp(0.72rem, 0.85vw, 0.92rem);
    }
    .archives-footer::before,
    .archives-footer::after {
      content: '';
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.34));
    }
    .archives-footer::after {
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.34), transparent);
    }
    .archives-footer p {
      margin: 0;
      text-align: center;
      white-space: nowrap;
    }
    .pager {
      grid-column: 1 / -1;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.6rem;
      color: rgba(23, 36, 72, 0.78);
      font-size: 0.76rem;
      font-weight: 800;
    }
    .pager + p {
      grid-column: 1 / -1;
    }
    .pager button {
      min-height: 1.9rem;
      padding: 0.25rem 0.75rem;
      border-color: rgba(23, 36, 72, 0.12);
      background: rgba(255, 255, 255, 0.28);
      color: #1a2751;
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.42;
    }
    button:focus-visible,
    input:focus-visible,
    select:focus-visible {
      outline: 3px solid rgba(255, 255, 255, 0.9);
      outline-offset: 3px;
    }
    .skeleton-card {
      min-height: 10rem;
      background:
        linear-gradient(90deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.08)),
        rgba(16, 27, 62, 0.36);
      background-size: 220% 100%;
    }
    @media (max-height: 900px) and (min-width: 981px) {
      .archives-page {
        padding-block: 1rem 0.8rem;
        gap: 0.65rem;
      }
      .archives-header {
        padding-bottom: 0.65rem;
      }
      .title-copy h1 {
        font-size: clamp(2rem, 3vw, 3.35rem);
      }
      .title-copy p {
        margin-top: 0.32rem;
        line-height: 1.34;
      }
      .archive-card {
        padding: 0.85rem;
      }
      h2 {
        font-size: clamp(1.18rem, 1.45vw, 1.55rem);
      }
    }
    @media (max-height: 800px) and (min-width: 981px) {
      .archives-page {
        padding-block: 0.8rem 0.65rem;
      }
      .archives-header {
        padding-bottom: 0.52rem;
      }
      .title-copy h1 {
        font-size: clamp(1.9rem, 2.7vw, 3rem);
      }
      .title-copy p {
        font-size: 0.92rem;
      }
      .search-field,
      .sort-field {
        min-height: 2.25rem;
      }
      .archives-grid {
        gap: 0.65rem;
      }
      .companion-row {
        margin-top: 0.35rem;
      }
      .finished-label,
      .metrics {
        margin-top: 0.28rem;
      }
      .archives-footer {
        min-height: 1.6rem;
      }
      .archives-footer p {
        display: none;
      }
    }
    @media (max-height: 720px) and (min-width: 981px) {
      .title-copy p,
      .finished-label,
      .metrics {
        display: none;
      }
      .archives-header {
        grid-template-columns: minmax(16rem, 0.7fr) minmax(24rem, 1fr);
      }
      .archive-card > button {
        min-height: 1.9rem;
        padding-block: 0.28rem;
      }
    }
    @media (max-width: 1180px) and (min-width: 981px) {
      .archives-header {
        grid-template-columns: minmax(18rem, 1fr);
      }
      .toolbar {
        max-width: 44rem;
      }
    }
    @media (max-width: 980px) {
      .archives-page {
        height: auto;
        min-height: 100svh;
        padding: 1rem;
        overflow: visible;
      }
      .archives-header,
      .toolbar,
      .archives-grid {
        grid-template-columns: 1fr;
      }
      .archives-grid {
        grid-template-rows: none;
        overflow: visible;
      }
      .archives-body {
        overflow: visible;
      }
      .archive-card {
        min-height: 12rem;
      }
      .archives-footer {
        grid-template-columns: 1fr;
      }
      .archives-footer::before,
      .archives-footer::after {
        display: none;
      }
      .archives-footer p {
        white-space: normal;
      }
    }
  `,
})
export class ArchivesPage implements OnInit {
  private readonly archivesService = inject(ArchivesService);
  private readonly router = inject(Router);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly archives = signal<ArchiveViewModel[]>([]);
  readonly searchTerm = signal('');
  readonly sortOrder = signal<ArchiveSort>('recent');
  readonly filter = signal<ArchiveFilter>('all');
  readonly page = signal(0);
  readonly filteredArchives = computed(() =>
    this.archivesService.filterAndSort(
      this.archives(),
      this.searchTerm(),
      this.sortOrder(),
      this.filter(),
    ),
  );
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filteredArchives().length / PAGE_SIZE)));
  readonly safePageIndex = computed(() => Math.min(this.page(), this.pageCount() - 1));
  readonly visibleArchives = computed(() => {
    const start = this.safePageIndex() * PAGE_SIZE;
    return this.filteredArchives().slice(start, start + PAGE_SIZE);
  });
  readonly showStatusTabs = computed(
    () => this.archives().length > 0 && !this.archivesService.hasCompletedOnly(this.archives()),
  );

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async retry(): Promise<void> {
    await this.load();
  }

  async open(archive: ArchiveViewModel): Promise<void> {
    await this.router.navigate(archive.route);
  }

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.page.set(0);
  }

  setSortOrder(value: ArchiveSort): void {
    this.sortOrder.set(value);
    this.page.set(0);
  }

  setFilter(value: ArchiveFilter): void {
    this.filter.set(value);
    this.page.set(0);
  }

  changePage(direction: -1 | 1): void {
    this.page.set(Math.min(Math.max(this.safePageIndex() + direction, 0), this.pageCount() - 1));
  }

  protected background(path: string): string {
    return `url("${path}")`;
  }

  protected companionInitial(name: string): string {
    return name.trim().charAt(0).toLocaleUpperCase('fr-FR') || '?';
  }

  protected finishedLabel(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `Terminée le ${new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date)}`;
  }

  protected chapterLabel(count: number | null): string | null {
    if (!count || count < 1) return null;
    return count === 1 ? '1 chapitre' : `${count} chapitres`;
  }

  protected durationLabel(archive: ArchiveViewModel): string | null {
    if (!archive.createdAt || !archive.completedAt) return null;
    const started = Date.parse(archive.createdAt);
    const ended = Date.parse(archive.completedAt);
    if (!Number.isFinite(started) || !Number.isFinite(ended) || ended < started) return null;
    const days = Math.floor((ended - started) / 86_400_000);
    if (days < 1) return "Moins d'un jour de récit";
    return days === 1 ? '1 jour de récit' : `${days} jours de récit`;
  }

  protected emptyTitle(): string {
    return this.archives().length ? 'Aucune archive trouvée.' : 'Aucune histoire archivée.';
  }

  protected emptyDescription(): string {
    return this.archives().length
      ? 'Modifiez votre recherche ou votre tri pour retrouver une histoire.'
      : 'Vos aventures terminées apparaîtront ici.';
  }

  protected skeletonCards(): number[] {
    return Array.from({ length: PAGE_SIZE }, (_, index) => index);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      this.archives.set(await this.archivesService.load());
      if (this.filter() === 'completed' && !this.showStatusTabs()) this.filter.set('all');
      this.page.set(0);
    } catch (error) {
      console.error('Failed to load archives', error);
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
