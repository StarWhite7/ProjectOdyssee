import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import type { GameSummary } from './game.service';
import { GameService } from './game.service';
import { MyAdventuresService } from './my-adventures.service';

describe('MyAdventuresService', () => {
  const user = signal({ id: 'user-1', email: 'mara@example.com', displayName: 'Mara' });
  const games = signal<GameSummary[]>([]);
  const gameService = {
    games: games.asReadonly(),
    refresh: vi.fn<() => Promise<void>>(),
  };

  beforeEach(() => {
    games.set([]);
    gameService.refresh.mockResolvedValue();
    TestBed.configureTestingModule({
      providers: [
        MyAdventuresService,
        {
          provide: AuthService,
          useValue: {
            user: user.asReadonly(),
            supabase: null,
          },
        },
        { provide: GameService, useValue: gameService },
      ],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('categorizes real summaries without inventing companion data', async () => {
    games.set([
      summary('active-1', 'Aventure réelle active', 'active', '2026-08-08T10:00:00.000Z'),
      summary('pending-1', 'Aventure réelle en attente', 'waiting', '2026-08-07T10:00:00.000Z'),
      summary('done-1', 'Aventure réelle terminée', 'completed', '2026-08-06T10:00:00.000Z'),
    ]);

    const service = TestBed.inject(MyAdventuresService);
    const result = await service.load();

    expect(gameService.refresh).toHaveBeenCalledOnce();
    expect(result.map((adventure) => adventure.group)).toEqual(['active', 'pending', 'completed']);
    expect(result.every((adventure) => adventure.companion === null)).toBe(true);
    expect(result.find((adventure) => adventure.id === 'active-1')?.route).toEqual([
      '/aventure',
      'active-1',
      'jouer',
    ]);
    expect(result.find((adventure) => adventure.id === 'pending-1')?.route).toEqual([
      '/aventure',
      'pending-1',
      'salon',
    ]);
  });

  it('routes pending character creation adventures to the real lobby id from source data', async () => {
    games.set([
      summary(
        'pending-character-real-id',
        'Personnage en prÃ©paration',
        'character_creation',
        '2026-08-07T10:00:00.000Z',
      ),
    ]);

    const service = TestBed.inject(MyAdventuresService);
    const result = await service.load();

    expect(result).toHaveLength(1);
    expect(result[0].group).toBe('pending');
    expect(result[0].route).toEqual(['/aventure', 'pending-character-real-id', 'salon']);
    expect(result[0].route).not.toContain('abc123');
  });

  it('filters and sorts only from loaded adventure data', () => {
    const service = TestBed.inject(MyAdventuresService);
    const adventures = [
      view('b', 'Bêta réelle', '2026-08-06T10:00:00.000Z'),
      view('a', 'Alpha réelle', '2026-08-08T10:00:00.000Z'),
    ];

    expect(service.filterAndSort(adventures, 'alpha', 'recent').map((item) => item.id)).toEqual([
      'a',
    ]);
    expect(service.filterAndSort(adventures, '', 'alpha').map((item) => item.id)).toEqual([
      'a',
      'b',
    ]);
  });

  function summary(id: string, title: string, status: string, updatedAt: string): GameSummary {
    return {
      id,
      title,
      inviteCode: `${id}-code`,
      status,
      playMode: 'asynchronous',
      turnNumber: 1,
      updatedAt,
    };
  }

  function view(id: string, title: string, lastActivityAt: string) {
    return {
      id,
      title,
      rawStatus: 'active',
      group: 'active' as const,
      statusLabel: 'En cours',
      actionLabel: 'Continuer' as const,
      route: ['/aventure', id, 'jouer'],
      companion: null,
      lastActivityAt,
      turnNumber: 1,
      coverImageUrl: '/images/dashboard/AventureEnCours.png',
    };
  }
});
