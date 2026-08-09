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
          game_title: 'Les Royaumes de Verre',
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
        gameTitle: 'Les Royaumes de Verre',
        readAt: null,
      }),
    ]);
    expect(notifications[0].message).toContain('Hazer');
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
      gameTitle: null,
      createdAt: null,
      readAt: null,
      message: 'Hazer vous a envoye une demande.',
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
});
