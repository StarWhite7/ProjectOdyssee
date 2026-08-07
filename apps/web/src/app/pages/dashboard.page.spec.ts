import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { GameService } from '../core/game.service';
import type { GameSummary } from '../core/game.service';
import { DashboardPage } from './dashboard.page';

describe('DashboardPage', () => {
  const user = signal({ id: 'user-1', email: 'mara@example.com', displayName: 'Aventurier' });
  const games = signal<GameSummary[]>([]);
  const gameService = {
    games: games.asReadonly(),
    refresh: vi.fn<() => Promise<void>>(),
    createGame: vi.fn<() => Promise<string>>(),
  };

  beforeEach(async () => {
    games.set([]);
    gameService.refresh.mockResolvedValue();
    gameService.createGame.mockResolvedValue('new-adventure');
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            user: user.asReadonly(),
            supabase: null,
          },
        },
        { provide: GameService, useValue: gameService },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  async function render(): Promise<{
    fixture: ReturnType<typeof TestBed.createComponent<DashboardPage>>;
    element: HTMLElement;
  }> {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('renders the real empty state without dashboard media duplication or fake adventures', async () => {
    const { element } = await render();

    expect(element.querySelectorAll('h1')).toHaveLength(1);
    expect(element.querySelector('h1')?.textContent).toContain('Bienvenue, Aventurier.');
    expect(element.querySelector('video')).toBeFalsy();
    expect(element.querySelector('app-ambient-audio-control')).toBeFalsy();
    expect(element.textContent).toContain('Votre odyssée commence ici.');
    expect(element.textContent).toContain('Aucune aventure en cours');
    expect(element.textContent).toContain("Vous n'avez pas encore commencé d'aventure.");
    expect(element.querySelectorAll('app-recent-adventure-card')).toHaveLength(0);
    expect(element.querySelectorAll('.recent-card-placeholder')).toHaveLength(3);
  });

  it('renders real user adventures and navigates with the selected adventure id', async () => {
    games.set([
      summary('real-waiting', 'Le Pont réel', 'waiting', 0, '2026-08-06T10:00:00.000Z'),
      summary('real-active', 'La Traversée réelle', 'active', 4, '2026-08-05T10:00:00.000Z'),
      summary('real-paused', 'Le Relais réel', 'paused', 2, '2026-08-04T10:00:00.000Z'),
    ]);
    const { fixture, element } = await render();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    expect(element.textContent).toContain('Votre odyssée continue.');
    expect(element.textContent).toContain('La Traversée réelle');
    expect(element.textContent).toContain('Tour 4');
    expect(element.textContent).toContain('En cours');
    expect(element.querySelectorAll('app-recent-adventure-card')).toHaveLength(2);
    expect(element.querySelectorAll('.recent-card-placeholder')).toHaveLength(1);
    expect(element.textContent).toContain('Le Pont réel');
    expect(element.textContent).toContain('Le Relais réel');

    await fixture.componentInstance.openAdventure(fixture.componentInstance.activeAdventure()!);

    expect(navigate).toHaveBeenCalledWith(['/aventure', 'real-active', 'jouer']);
  });

  it('keeps three recent slots when only the current adventure exists', async () => {
    games.set([
      summary('only-current', 'Unique aventure réelle', 'waiting', 0, '2026-08-06T10:00:00.000Z'),
    ]);
    const { element } = await render();

    expect(element.textContent).toContain('Unique aventure réelle');
    expect(element.querySelectorAll('app-recent-adventure-card')).toHaveLength(0);
    expect(element.querySelectorAll('.recent-card-placeholder')).toHaveLength(3);
    expect(element.textContent).toContain('Aucune autre aventure');
  });

  it('limits recent adventures to three real entries and excludes the current card', async () => {
    games.set([
      summary('current', 'Aventure active', 'active', 1, '2026-08-06T10:00:00.000Z'),
      summary('recent-1', 'Première récente', 'paused', 2, '2026-08-05T10:00:00.000Z'),
      summary('recent-2', 'Deuxième récente', 'completed', 3, '2026-08-04T10:00:00.000Z'),
      summary('recent-3', 'Troisième récente', 'waiting', 0, '2026-08-03T10:00:00.000Z'),
      summary('recent-4', 'Quatrième récente', 'waiting', 0, '2026-08-02T10:00:00.000Z'),
    ]);
    const { element } = await render();

    expect(element.querySelectorAll('app-recent-adventure-card')).toHaveLength(3);
    expect(element.querySelectorAll('.recent-card-placeholder')).toHaveLength(0);
    expect(element.textContent).toContain('Aventure active');
    expect(element.textContent).toContain('Première récente');
    expect(element.textContent).toContain('Deuxième récente');
    expect(element.textContent).toContain('Troisième récente');
    expect(element.textContent).not.toContain('Quatrième récente');
  });

  it('shows a distinct error state and lets the user retry loading', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    gameService.refresh.mockRejectedValueOnce(new Error('network failure'));
    const { fixture, element } = await render();

    expect(element.textContent).toContain('Impossible de charger vos aventures');
    expect(element.textContent).toContain('Réessayer');
    expect(element.textContent).not.toContain('Aucune aventure en cours');

    gameService.refresh.mockResolvedValueOnce();
    await fixture.componentInstance.retry();
    fixture.detectChanges();

    expect(gameService.refresh).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.loadError()).toBe(false);
    consoleError.mockRestore();
  });

  it('creates through the existing game service and refreshes before navigation', async () => {
    const { fixture } = await render();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await fixture.componentInstance.startNewAdventure();

    expect(gameService.createGame).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Une aventure sans titre',
        playMode: 'asynchronous',
      }),
    );
    expect(gameService.refresh).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith(['/aventure', 'new-adventure', 'salon']);
  });

  function summary(
    id: string,
    title: string,
    status: string,
    turnNumber: number,
    updatedAt: string,
  ): GameSummary {
    return {
      id,
      title,
      inviteCode: `${id}-code`,
      status,
      playMode: 'asynchronous',
      turnNumber,
      updatedAt,
    };
  }
});
