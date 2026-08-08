import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { GameService } from './game.service';

export type InvitationDirection = 'received' | 'sent';

export type InvitationViewModel = {
  id: string;
  direction: InvitationDirection;
  adventureId: string;
  adventureTitle: string;
  otherUserId: string;
  otherUserName: string | null;
  otherUserAvatarUrl: string | null;
  status: string;
  createdAt: string | null;
  coverImageUrl: string;
  canRespond: boolean;
};

export type RecentCompanionViewModel = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  lastAdventureTitle: string;
  lastActivityAt: string | null;
};

export type InvitationsPageData = {
  received: InvitationViewModel[];
  sent: InvitationViewModel[];
  recentCompanions: RecentCompanionViewModel[];
  invitationBackendAvailable: boolean;
};

type SupabaseMemberRow = {
  game_id?: unknown;
};

type SupabaseProfileRow = {
  id?: unknown;
  display_name?: unknown;
  avatar_url?: unknown;
};

type SupabaseGamePlayerRow = {
  player_id?: unknown;
  profiles?: SupabaseProfileRow | SupabaseProfileRow[] | null;
};

type SupabaseCompanionGameRow = {
  id?: unknown;
  title?: unknown;
  updated_at?: unknown;
  game_players?: SupabaseGamePlayerRow[] | null;
};

@Injectable({ providedIn: 'root' })
export class InvitationsService {
  private readonly auth = inject(AuthService);
  private readonly games = inject(GameService);

  async load(): Promise<InvitationsPageData> {
    const client = this.auth.supabase;
    const userId = this.auth.user()?.id;
    if (!userId) return this.emptyData();

    if (!client) {
      await this.games.refresh();
      return this.emptyData();
    }

    const { data: memberships, error: membershipError } = await client
      .from('game_players')
      .select('game_id')
      .eq('player_id', userId)
      .is('abandoned_at', null);

    if (membershipError) throw membershipError;

    const gameIds = ((memberships ?? []) as SupabaseMemberRow[])
      .map((membership) => this.stringValue(membership.game_id))
      .filter((id): id is string => Boolean(id));

    if (!gameIds.length) return this.emptyData();

    const { data: games, error: gamesError } = await client
      .from('games')
      .select(
        `
          id,
          title,
          updated_at,
          game_players (
            player_id,
            profiles (
              id,
              display_name,
              avatar_url
            )
          )
        `,
      )
      .in('id', gameIds)
      .order('updated_at', { ascending: false });

    if (gamesError) throw gamesError;

    return {
      received: [],
      sent: [],
      recentCompanions: this.recentCompanionsFromGames(
        (games ?? []) as SupabaseCompanionGameRow[],
        userId,
      ),
      invitationBackendAvailable: false,
    };
  }

  async accept(invitation: InvitationViewModel): Promise<void> {
    void invitation;
    throw new Error('Invitation backend is not available.');
  }

  async refuse(invitation: InvitationViewModel): Promise<void> {
    void invitation;
    throw new Error('Invitation backend is not available.');
  }

  private recentCompanionsFromGames(
    games: SupabaseCompanionGameRow[],
    userId: string,
  ): RecentCompanionViewModel[] {
    const companions = new Map<
      string,
      RecentCompanionViewModel & { lastActivityTime: number }
    >();

    for (const game of games) {
      const title = this.stringValue(game.title)?.trim();
      const updatedAt = this.validDate(this.stringValue(game.updated_at));
      const activityTime = updatedAt ? Date.parse(updatedAt) : 0;
      for (const player of game.game_players ?? []) {
        const playerId = this.stringValue(player.player_id);
        if (!playerId || playerId === userId) continue;
        const profile = Array.isArray(player.profiles) ? player.profiles[0] : player.profiles;
        const displayName = this.stringValue(profile?.display_name)?.trim();
        if (!displayName || !title) continue;
        const existing = companions.get(playerId);
        if (existing && existing.lastActivityTime >= activityTime) continue;
        companions.set(playerId, {
          userId: playerId,
          displayName,
          avatarUrl: this.stringValue(profile?.avatar_url),
          lastAdventureTitle: title,
          lastActivityAt: updatedAt,
          lastActivityTime: activityTime,
        });
      }
    }

    return [...companions.values()]
      .sort((a, b) => b.lastActivityTime - a.lastActivityTime)
      .slice(0, 3)
      .map((companion) => ({
        userId: companion.userId,
        displayName: companion.displayName,
        avatarUrl: companion.avatarUrl,
        lastAdventureTitle: companion.lastAdventureTitle,
        lastActivityAt: companion.lastActivityAt,
      }));
  }

  private emptyData(): InvitationsPageData {
    return {
      received: [],
      sent: [],
      recentCompanions: [],
      invitationBackendAvailable: false,
    };
  }

  private validDate(value: string | null): string | null {
    if (!value) return null;
    return Number.isFinite(Date.parse(value)) ? value : null;
  }

  private stringValue(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }
}
