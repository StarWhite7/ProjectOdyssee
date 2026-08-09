import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { InvitationsService } from './invitations.service';

type QueryBuilder = {
  select: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
};

describe('InvitationsService', () => {
  const user = signal({ id: 'user-1', email: 'mara@example.com', displayName: 'Mara' });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('returns empty social data without inventing content when no backend exists', async () => {
    configure(null);

    const data = await TestBed.inject(InvitationsService).load();

    expect(data.invitationBackendAvailable).toBe(false);
    expect(data.received).toEqual([]);
    expect(data.sent).toEqual([]);
    expect(data.receivedFriendRequests).toEqual([]);
    expect(data.sentFriendRequests).toEqual([]);
    expect(data.friends).toEqual([]);
    expect(data.blockedUsers).toEqual([]);
  });

  it('maps real social rows from Supabase', async () => {
    const client = clientWithTables({
      friend_requests: [
        {
          id: 'request-in',
          requester_id: 'user-2',
          recipient_id: 'user-1',
          created_at: '2026-08-08T10:00:00.000Z',
          requester: { id: 'user-2', display_name: 'Hazer', avatar_url: 'hazer.png' },
        },
        {
          id: 'request-out',
          requester_id: 'user-1',
          recipient_id: 'user-3',
          created_at: '2026-08-08T11:00:00.000Z',
          recipient: { id: 'user-3', display_name: 'StarWhite' },
        },
      ],
      friendships: [
        {
          user_low_id: 'user-1',
          user_high_id: 'user-4',
          created_at: '2026-08-07T10:00:00.000Z',
          high: { id: 'user-4', display_name: 'Kael' },
        },
      ],
      game_invitations: [
        {
          id: 'game-invite-in',
          game_id: 'game-1',
          sender_id: 'user-2',
          recipient_id: 'user-1',
          status: 'pending',
          created_at: '2026-08-08T12:00:00.000Z',
          sender: { id: 'user-2', display_name: 'Hazer' },
          games: { id: 'game-1', title: 'Les Royaumes de Verre', status: 'waiting' },
        },
        {
          id: 'game-invite-out',
          game_id: 'game-2',
          sender_id: 'user-1',
          recipient_id: 'user-4',
          status: 'pending',
          created_at: '2026-08-08T13:00:00.000Z',
          recipient: { id: 'user-4', display_name: 'Kael' },
          games: { id: 'game-2', title: 'Le Pacte des Brumes', status: 'waiting' },
        },
      ],
      user_blocks: [
        {
          blocked_id: 'user-5',
          created_at: '2026-08-05T10:00:00.000Z',
          blocked: { id: 'user-5', display_name: 'Nocturne' },
        },
      ],
      games: [{ id: 'game-1', title: 'Les Royaumes de Verre', status: 'waiting' }],
    });
    configure(client);

    const data = await TestBed.inject(InvitationsService).load();

    expect(data.invitationBackendAvailable).toBe(true);
    expect(data.receivedFriendRequests.map((request) => request.otherUserName)).toEqual(['Hazer']);
    expect(data.sentFriendRequests.map((request) => request.otherUserName)).toEqual(['StarWhite']);
    expect(data.received.map((invitation) => invitation.adventureTitle)).toEqual([
      'Les Royaumes de Verre',
    ]);
    expect(data.sent.map((invitation) => invitation.otherUserName)).toEqual(['Kael']);
    expect(data.friends.map((friend) => friend.displayName)).toEqual(['Kael']);
    expect(data.blockedUsers.map((blocked) => blocked.displayName)).toEqual(['Nocturne']);
    expect(data.availableAdventures.map((adventure) => adventure.title)).toEqual([
      'Les Royaumes de Verre',
    ]);
  });

  it('searches profiles through the dedicated RPC only', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'user-2',
          display_name: 'Hazer',
          avatar_url: null,
          relation_status: 'none',
        },
      ],
      error: null,
    });
    configure({ rpc });

    const service = TestBed.inject(InvitationsService);

    await expect(service.searchPlayers('h')).resolves.toEqual([]);
    await expect(service.searchPlayers('ha')).resolves.toEqual([
      {
        userId: 'user-2',
        displayName: 'Hazer',
        avatarUrl: null,
        relationStatus: 'none',
      },
    ]);
    expect(rpc).toHaveBeenCalledWith('search_social_profiles', {
      search_query: 'ha',
      max_results: 8,
    });
  });

  it('routes social and game actions to the global RPC layer', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    configure({ rpc });
    const service = TestBed.inject(InvitationsService);

    await service.sendFriendRequest('user-2');
    await service.acceptFriendRequest(friendRequest('request-1'));
    await service.declineFriendRequest(friendRequest('request-2'));
    await service.cancelFriendRequest(friendRequest('request-3'));
    await service.inviteFriendToGame(
      { userId: 'user-2', displayName: 'Hazer', avatarUrl: null, createdAt: null },
      'game-1',
    );
    await service.accept(gameInvitation('game-invite-1'));
    await service.refuse(gameInvitation('game-invite-2'));

    expect(rpc).toHaveBeenCalledWith('send_friend_request', { target_user_id: 'user-2' });
    expect(rpc).toHaveBeenCalledWith('accept_friend_request', { request_id: 'request-1' });
    expect(rpc).toHaveBeenCalledWith('decline_friend_request', { request_id: 'request-2' });
    expect(rpc).toHaveBeenCalledWith('cancel_friend_request', { request_id: 'request-3' });
    expect(rpc).toHaveBeenCalledWith('send_game_invitation', {
      target_game_id: 'game-1',
      target_user_id: 'user-2',
    });
    expect(rpc).toHaveBeenCalledWith('accept_game_invitation', {
      invitation_id: 'game-invite-1',
    });
    expect(rpc).toHaveBeenCalledWith('decline_game_invitation', {
      invitation_id: 'game-invite-2',
    });
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
      ],
    });
  }

  function clientWithTables(tables: Record<string, unknown[]>): { from: ReturnType<typeof vi.fn> } {
    return {
      from: vi.fn((table: string) => deferredQuery(tables[table] ?? [])),
    };
  }

  function deferredQuery(data: unknown[]): QueryBuilder {
    const query: QueryBuilder = {
      select: vi.fn(() => query),
      order: vi.fn(() => Promise.resolve({ data, error: null })),
      eq: vi.fn(() => query),
      in: vi.fn(() => query),
    };
    return query;
  }

  function friendRequest(id: string) {
    return {
      id,
      direction: 'received' as const,
      otherUserId: 'user-2',
      otherUserName: 'Hazer',
      otherUserAvatarUrl: null,
      createdAt: null,
      canRespond: true,
    };
  }

  function gameInvitation(id: string) {
    return {
      id,
      direction: 'received' as const,
      adventureId: 'game-1',
      adventureTitle: 'Les Royaumes de Verre',
      otherUserId: 'user-2',
      otherUserName: 'Hazer',
      otherUserAvatarUrl: null,
      status: 'pending',
      createdAt: null,
      coverImageUrl: '/images/dashboard/AventureEnCours.png',
      canRespond: true,
    };
  }
});
