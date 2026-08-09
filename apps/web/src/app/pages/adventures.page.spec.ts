import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MyAdventuresService } from '../core/my-adventures.service';
import type { MyAdventureSort, MyAdventureViewModel } from '../core/my-adventures.service';
import { AdventuresPage } from './adventures.page';

@Component({ template: '' })
class TestRouteComponent {}

describe('AdventuresPage', () => {
  const pendingAdventure: MyAdventureViewModel = {
    id: 'pending-real-id',
    title: 'Invitation réelle',
    rawStatus: 'waiting',
    group: 'pending',
    statusLabel: 'En attente',
    actionLabel: 'Continuer',
    route: ['/aventure', 'pending-real-id', 'salon'],
    companion: null,
    lastActivityAt: '2026-08-07T10:00:00.000Z',
    turnNumber: 0,
    coverImageUrl: '/images/dashboard/DernierAventure.png',
  };

  const activeAdventure: MyAdventureViewModel = {
    ...pendingAdventure,
    id: 'active-real-id',
    title: 'Aventure active',
    rawStatus: 'active',
    group: 'active',
    statusLabel: 'En cours',
    route: ['/aventure', 'active-real-id', 'jouer'],
    coverImageUrl: '/images/dashboard/AventureEnCours.png',
  };

  const completedAdventure: MyAdventureViewModel = {
    ...pendingAdventure,
    id: 'completed-real-id',
    title: 'Aventure terminée',
    rawStatus: 'completed',
    group: 'completed',
    statusLabel: 'Terminée',
    actionLabel: 'Consulter',
    route: ['/aventure', 'completed-real-id', 'journal'],
  };

  const adventures = [activeAdventure, pendingAdventure, completedAdventure];
  const adventuresService = {
    load: vi.fn<() => Promise<MyAdventureViewModel[]>>(),
    filterAndSort:
      vi.fn<
        (
          adventures: MyAdventureViewModel[],
          searchTerm: string,
          sort: MyAdventureSort,
        ) => MyAdventureViewModel[]
      >(),
  };

  beforeEach(async () => {
    adventuresService.load.mockResolvedValue(adventures);
    adventuresService.filterAndSort.mockImplementation((items) => items);

    await TestBed.configureTestingModule({
      imports: [AdventuresPage],
      providers: [
        provideRouter([
          { path: 'aventure/:gameId/salon', component: TestRouteComponent },
          { path: 'aventure/:gameId/jouer', component: TestRouteComponent },
          { path: 'aventure/:gameId/journal', component: TestRouteComponent },
        ]),
        { provide: MyAdventuresService, useValue: adventuresService },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
    vi.clearAllMocks();
  });

  async function render(): Promise<{
    fixture: ReturnType<typeof TestBed.createComponent<AdventuresPage>>;
    element: HTMLElement;
  }> {
    const fixture = TestBed.createComponent(AdventuresPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('opens a pending adventure lobby from its real game id when the card is clicked', async () => {
    const { fixture, element } = await render();
    const router = TestBed.inject(Router);
    const pendingCard = element.querySelector<HTMLAnchorElement>('a.pending-card');

    expect(pendingCard).not.toBeNull();
    expect(pendingCard?.getAttribute('href')).toBe('/aventure/pending-real-id/salon');
    expect(pendingCard?.getAttribute('href')).not.toContain('abc123');
    expect(element.querySelector('article.pending-card')).toBeNull();

    pendingCard!.click();
    await fixture.whenStable();

    expect(router.url).toBe('/aventure/pending-real-id/salon');
  });

  it('keeps active and completed card navigation on their existing routes', async () => {
    const { fixture } = await render();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await fixture.componentInstance.open(activeAdventure);
    await fixture.componentInstance.open(completedAdventure);

    expect(navigate).toHaveBeenCalledWith(['/aventure', 'active-real-id', 'jouer']);
    expect(navigate).toHaveBeenCalledWith(['/aventure', 'completed-real-id', 'journal']);
  });
});
