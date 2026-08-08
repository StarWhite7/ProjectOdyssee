import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArchivesService, type ArchiveViewModel } from './archives.service';
import { AuthService } from './auth.service';
import type { GameSummary } from './game.service';
import { GameService } from './game.service';

type QueryBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq?: ReturnType<typeof vi.fn>;
  is?: ReturnType<typeof vi.fn>;
  in?: ReturnType<typeof vi.fn>;
  order?: ReturnType<typeof vi.fn>;
};

describe('ArchivesService', () => {
  const user = signal({ id: 'user-1', email: 'mara@example.com', displayName: 'Mara' });
  const games = signal<GameSummary[]>([]);
  const gameService = {
    games: games.asReadonly(),
    refresh: vi.fn<() => Promise<void>>(),
  };

  beforeEach(() => {
    games.set([]);
    gameService.refresh.mockResolvedValue();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads only completed local archives without inventing companion data', async () => {
    configure(null);
    games.set([
      summary('active-1', 'Aventure active', 'active', 2, '2026-08-08T10:00:00.000Z'),
      summary('done-1', 'Aventure terminee', 'completed', 3, '2026-08-06T10:00:00.000Z'),
      summary('abandoned-1', 'Aventure abandonnee', 'abandoned', 1, '2026-08-05T10:00:00.000Z'),
    ]);

    const result = await TestBed.inject(ArchivesService).load();

    expect(gameService.refresh).toHaveBeenCalledOnce();
    expect(result.map((archive) => archive.id)).toEqual(['done-1']);
    expect(result[0].companion).toBeNull();
    expect(result[0].route).toEqual(['/aventure', 'done-1', 'journal']);
  });

  it('queries memberships first and derives companion plus chapter counts from real rows', async () => {
    const membershipQuery = deferredQuery([{ game_id: 'game-1' }, { game_id: 'game-2' }]);
    const gamesQuery = deferredQuery([
      {
        id: 'game-1',
        title: 'Archive reelle',
        status: 'completed',
        turn_number: 9,
        created_at: '2026-08-01T10:00:00.000Z',
        updated_at: '2026-08-08T10:00:00.000Z',
        game_players: [
          { player_id: 'user-1', profiles: { id: 'user-1', display_name: 'Mara' } },
          {
            player_id: 'user-2',
            profiles: { id: 'user-2', display_name: 'Compagnon', avatar_url: 'avatar.png' },
          },
        ],
      },
    ]);
    const turnsQuery = deferredQuery(
      [
      { game_id: 'game-1' },
      { game_id: 'game-1' },
      { game_id: 'game-1' },
      ],
      { resolveOnIn: true },
    );
    const from = vi.fn((table: string) => {
      if (table === 'game_players') return membershipQuery;
      if (table === 'games') return gamesQuery;
      return turnsQuery;
    });
    configure({ from });

    const result = await TestBed.inject(ArchivesService).load();

    expect(from).toHaveBeenCalledWith('game_players');
    expect(membershipQuery.eq).toHaveBeenCalledWith('player_id', 'user-1');
    expect(membershipQuery.is).toHaveBeenCalledWith('abandoned_at', null);
    expect(gamesQuery.in).toHaveBeenCalledWith('id', ['game-1', 'game-2']);
    expect(gamesQuery.in).toHaveBeenCalledWith('status', ['completed', 'finished', 'archived']);
    expect(result[0]).toMatchObject({
      id: 'game-1',
      title: 'Archive reelle',
      companion: { name: 'Compagnon', avatarUrl: 'avatar.png' },
      chapterCount: 3,
    });
  });

  it('filters by search and sorts without using fixed mock content', () => {
    configure(null);
    const service = TestBed.inject(ArchivesService);
    const archives: ArchiveViewModel[] = [
      archive('b', 'Beta', '2026-08-06T10:00:00.000Z', 'Nora'),
      archive('a', 'Alpha', '2026-08-08T10:00:00.000Z', 'Elian'),
    ];

    expect(service.filterAndSort(archives, 'elian', 'recent', 'all').map((item) => item.id)).toEqual([
      'a',
    ]);
    expect(service.filterAndSort(archives, '', 'alpha', 'all').map((item) => item.id)).toEqual([
      'a',
      'b',
    ]);
    expect(
      service.filterAndSort(
        [archive('c', 'Legacy', '2026-08-07T10:00:00.000Z', null, 'archived')],
        '',
        'recent',
        'completed',
      ),
    ).toEqual([]);
  });

  function configure(client: unknown): void {
    TestBed.configureTestingModule({
      providers: [
        ArchivesService,
        {
          provide: AuthService,
          useValue: {
            user: user.asReadonly(),
            supabase: client,
          },
        },
        { provide: GameService, useValue: gameService },
      ],
    });
  }

  function deferredQuery(data: unknown[], options: { resolveOnIn?: boolean } = {}): QueryBuilder {
    const query: QueryBuilder = {
      select: vi.fn(() => query),
    };
    query.eq = vi.fn(() => query);
    query.is = vi.fn(() => Promise.resolve({ data, error: null }));
    query.in = vi.fn(() => (options.resolveOnIn ? Promise.resolve({ data, error: null }) : query));
    query.order = vi.fn(() => Promise.resolve({ data, error: null }));
    return query;
  }

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

  function archive(
    id: string,
    title: string,
    completedAt: string,
    companionName: string | null,
    rawStatus = 'completed',
  ): ArchiveViewModel {
    return {
      id,
      title,
      rawStatus,
      route: ['/aventure', id, 'journal'],
      coverImageUrl: '/images/dashboard/DernierAventure.png',
      companion: companionName ? { name: companionName, avatarUrl: null } : null,
      completedAt,
      createdAt: null,
      chapterCount: 1,
    };
  }
});
