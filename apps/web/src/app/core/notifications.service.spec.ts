import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const user = signal({ id: 'user-1', email: 'mara@example.com', displayName: 'Mara' });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('returns no notifications without a Supabase backend', async () => {
    configure(null);

    await expect(TestBed.inject(NotificationsService).load()).resolves.toEqual([]);
  });

  it('loads notifications through the dedicated RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'notification-1',
          type: 'game_invitation_received',
          actor_display_name: 'Hazer',
          actor_avatar_url: 'hazer.png',
          game_id: 'game-1',
          game_title: 'Les Royaumes de Verre',
          game_invitation_id: 'game-invite-1',
          game_invitation_status: 'pending',
          created_at: '2026-08-08T10:00:00.000Z',
          read_at: null,
        },
      ],
      error: null,
    });
    configure({ rpc });

    const notifications = await TestBed.inject(NotificationsService).load();

    expect(rpc).toHaveBeenCalledWith('get_my_notifications', { max_results: 12 });
    expect(notifications).toEqual([
      expect.objectContaining({
        id: 'notification-1',
        actorName: 'Hazer',
        gameId: 'game-1',
        gameTitle: 'Les Royaumes de Verre',
        gameInvitationId: 'game-invite-1',
        gameInvitationStatus: 'pending',
        readAt: null,
        canRespondToGameInvitation: true,
      }),
    ]);
    expect(notifications[0].message).toContain('Hazer');
  });

  it('keeps standard notifications passive and hides resolved game invitation notifications', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'notification-1',
          type: 'friend_request_received',
          actor_display_name: 'Kael',
          actor_avatar_url: null,
          game_id: null,
          game_title: null,
          game_invitation_id: null,
          game_invitation_status: null,
          created_at: '2026-08-08T10:00:00.000Z',
          read_at: null,
        },
        {
          id: 'notification-2',
          type: 'game_invitation_received',
          actor_display_name: 'Hazer',
          actor_avatar_url: null,
          game_id: 'game-1',
          game_title: 'Les Royaumes de Verre',
          game_invitation_id: 'game-invite-1',
          game_invitation_status: 'accepted',
          created_at: '2026-08-08T11:00:00.000Z',
          read_at: null,
        },
      ],
      error: null,
    });
    configure({ rpc });

    const notifications = await TestBed.inject(NotificationsService).load();

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toEqual(
      expect.objectContaining({
        id: 'notification-1',
        canRespondToGameInvitation: false,
      }),
    );
  });

  it('accepts an interactive game invitation through its real invitation id', async () => {
    const rpc = vi.fn((name: string) =>
      Promise.resolve({ data: name === 'accept_game_invitation' ? 'game-1' : null, error: null }),
    );
    configure({ rpc });
    const service = TestBed.inject(NotificationsService);

    await expect(service.acceptGameInvitation(gameInvitationNotification())).resolves.toBe(
      'game-1',
    );

    expect(rpc).toHaveBeenCalledWith('accept_game_invitation', {
      invitation_id: 'game-invite-1',
    });
    expect(rpc).toHaveBeenCalledWith('mark_notification_read', {
      notification_id: 'notification-1',
    });
  });

  it('declines an interactive game invitation through its real invitation id', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    configure({ rpc });

    await TestBed.inject(NotificationsService).declineGameInvitation(gameInvitationNotification());

    expect(rpc).toHaveBeenCalledWith('decline_game_invitation', {
      invitation_id: 'game-invite-1',
    });
    expect(rpc).toHaveBeenCalledWith('mark_notification_read', {
      notification_id: 'notification-1',
    });
  });

  it('marks one or all notifications as read through RPCs', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    configure({ rpc });
    const service = TestBed.inject(NotificationsService);

    await service.markRead({
      id: 'notification-1',
      type: 'friend_request_received',
      actorName: 'Hazer',
      actorAvatarUrl: null,
      gameId: null,
      gameTitle: null,
      gameInvitationId: null,
      gameInvitationStatus: null,
      createdAt: null,
      readAt: null,
      message: 'Hazer vous a envoye une demande.',
      canRespondToGameInvitation: false,
    });
    await service.markAllRead();

    expect(rpc).toHaveBeenCalledWith('mark_notification_read', {
      notification_id: 'notification-1',
    });
    expect(rpc).toHaveBeenCalledWith('mark_all_notifications_read');
  });

  function configure(client: unknown): void {
    TestBed.configureTestingModule({
      providers: [
        NotificationsService,
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

  function gameInvitationNotification() {
    return {
      id: 'notification-1',
      type: 'game_invitation_received',
      actorName: 'Hazer',
      actorAvatarUrl: null,
      gameId: 'game-1',
      gameTitle: 'Les Royaumes de Verre',
      gameInvitationId: 'game-invite-1',
      gameInvitationStatus: 'pending',
      createdAt: null,
      readAt: null,
      message: 'Hazer vous a invite a rejoindre une aventure.',
      canRespondToGameInvitation: true,
    };
  }
});
