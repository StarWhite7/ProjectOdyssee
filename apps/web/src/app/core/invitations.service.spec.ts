import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { GameService } from './game.service';
import { InvitationsService } from './invitations.service';

type QueryBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq?: ReturnType<typeof vi.fn>;
  is?: ReturnType<typeof vi.fn>;
  in?: ReturnType<typeof vi.fn>;
  order?: ReturnType<typeof vi.fn>;
};

describe('InvitationsService', () => {
  const user = signal({ id: 'user-1', email: 'mara@example.com', displayName: 'Mara' });
  const gameService = {
    refresh: vi.fn<() => Promise<void>>(),
  };

  beforeEach(() => {
    gameService.refresh.mockResolvedValue();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty invitation lists without inventing content when no backend exists', async () => {
    configure(null);

    const data = await TestBed.inject(InvitationsService).load();

    expect(gameService.refresh).toHaveBeenCalledOnce();
    expect(data.received).toEqual([]);
    expect(data.sent).toEqual([]);
    expect(data.recentCompanions).toEqual([]);
    expect(data.invitationBackendAvailable).toBe(false);
  });

  it('builds recent companions from shared game memberships only', async () => {
    const membershipQuery = deferredQuery([{ game_id: 'game-1' }, { game_id: 'game-2' }]);
    const gamesQuery = deferredQuery([
      {
        id: 'game-1',
        title: 'Aventure réelle récente',
        updated_at: '2026-08-08T10:00:00.000Z',
        game_players: [
          { player_id: 'user-1', profiles: { id: 'user-1', display_name: 'Mara' } },
          {
            player_id: 'user-2',
            profiles: { id: 'user-2', display_name: 'Compagnon', avatar_url: 'avatar.png' },
          },
        ],
      },
      {
        id: 'game-2',
        title: 'Aventure réelle ancienne',
        updated_at: '2026-08-07T10:00:00.000Z',
        game_players: [
          { player_id: 'user-1', profiles: { id: 'user-1', display_name: 'Mara' } },
          { player_id: 'user-3', profiles: { id: 'user-3', display_name: 'Autre compagnon' } },
        ],
      },
    ]);
    configure({
      from: vi.fn((table: string) => (table === 'game_players' ? membershipQuery : gamesQuery)),
    });

    const data = await TestBed.inject(InvitationsService).load();

    expect(data.received).toEqual([]);
    expect(data.sent).toEqual([]);
    expect(data.recentCompanions.map((companion) => companion.displayName)).toEqual([
      'Compagnon',
      'Autre compagnon',
    ]);
    expect(data.recentCompanions[0].lastAdventureTitle).toBe('Aventure réelle récente');
  });

  function configure(client: unknown): void {
    TestBed.configureTestingModule({
      providers: [
        InvitationsService,
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

  function deferredQuery(data: unknown[]): QueryBuilder {
    const query: QueryBuilder = {
      select: vi.fn(() => query),
    };
    query.eq = vi.fn(() => query);
    query.is = vi.fn(() => Promise.resolve({ data, error: null }));
    query.in = vi.fn(() => query);
    query.order = vi.fn(() => Promise.resolve({ data, error: null }));
    return query;
  }
});
