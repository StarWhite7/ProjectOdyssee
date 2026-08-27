import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';

export type NotificationViewModel = {
  id: string;
  type: string;
  actorName: string | null;
  actorAvatarUrl: string | null;
  gameId: string | null;
  gameTitle: string | null;
  gameInvitationId: string | null;
  gameInvitationStatus: string | null;
  createdAt: string | null;
  readAt: string | null;
  message: string;
  canRespondToGameInvitation: boolean;
};

type NotificationRow = {
  id?: unknown;
  type?: unknown;
  actor_display_name?: unknown;
  actor_avatar_url?: unknown;
  game_id?: unknown;
  game_title?: unknown;
  game_invitation_id?: unknown;
  game_invitation_status?: unknown;
  created_at?: unknown;
  read_at?: unknown;
};

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly auth = inject(AuthService);

  async load(limit = 12): Promise<NotificationViewModel[]> {
    const client = this.auth.supabase;
    if (!client || !this.auth.user()) return [];

    const { data, error } = await client.rpc('get_my_notifications', { max_results: limit });
    if (error) throw error;

    return ((data ?? []) as NotificationRow[]).flatMap((row) => {
      const id = this.stringValue(row.id);
      const type = this.stringValue(row.type);
      if (!id || !type) return [];
      const actorName = this.stringValue(row.actor_display_name);
      const gameId = this.stringValue(row.game_id);
      const gameTitle = this.stringValue(row.game_title);
      const gameInvitationId = this.stringValue(row.game_invitation_id);
      const gameInvitationStatus = this.stringValue(row.game_invitation_status);
      if (type === 'game_invitation_received' && gameInvitationStatus !== 'pending') return [];
      return [
        {
          id,
          type,
          actorName,
          actorAvatarUrl: this.stringValue(row.actor_avatar_url),
          gameId,
          gameTitle,
          gameInvitationId,
          gameInvitationStatus,
          createdAt: this.validDate(this.stringValue(row.created_at)),
          readAt: this.validDate(this.stringValue(row.read_at)),
          message: this.message(type, actorName, gameTitle),
          canRespondToGameInvitation:
            type === 'game_invitation_received' &&
            gameInvitationStatus === 'pending' &&
            Boolean(gameId && gameInvitationId),
        },
      ];
    });
  }

  async acceptGameInvitation(notification: NotificationViewModel): Promise<string> {
    const client = this.auth.supabase;
    if (!client || !notification.gameInvitationId) throw new Error('Invitation indisponible.');
    const { data, error } = await client.rpc('accept_game_invitation', {
      invitation_id: notification.gameInvitationId,
    });
    if (error) throw error;
    await this.markRead(notification);
    return String(data);
  }

  async declineGameInvitation(notification: NotificationViewModel): Promise<void> {
    const client = this.auth.supabase;
    if (!client || !notification.gameInvitationId) throw new Error('Invitation indisponible.');
    const { error } = await client.rpc('decline_game_invitation', {
      invitation_id: notification.gameInvitationId,
    });
    if (error) throw error;
    await this.markRead(notification);
  }

  async markRead(notification: NotificationViewModel): Promise<void> {
    const client = this.auth.supabase;
    if (!client) return;
    const { error } = await client.rpc('mark_notification_read', {
      notification_id: notification.id,
    });
    if (error) throw error;
  }

  async markAllRead(): Promise<void> {
    const client = this.auth.supabase;
    if (!client) return;
    const { error } = await client.rpc('mark_all_notifications_read');
    if (error) throw error;
  }

  private message(type: string, actorName: string | null, gameTitle: string | null): string {
    const actor = actorName ?? 'Un joueur';
    const game = gameTitle ? ` "${gameTitle}"` : '';
    switch (type) {
      case 'friend_request_received':
        return `${actor} vous a envoye une demande d'ami.`;
      case 'friend_request_accepted':
        return `${actor} a accepte votre demande d'ami.`;
      case 'game_invitation_received':
        return `${actor} vous a invite a rejoindre une aventure.`;
      case 'game_invitation_accepted':
        return `${actor} a accepte votre invitation${game}.`;
      case 'game_invitation_declined':
        return `${actor} a refuse votre invitation${game}.`;
      default:
        return 'Nouvelle notification.';
    }
  }

  private validDate(value: string | null): string | null {
    if (!value) return null;
    return Number.isFinite(Date.parse(value)) ? value : null;
  }

  private stringValue(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }
}
