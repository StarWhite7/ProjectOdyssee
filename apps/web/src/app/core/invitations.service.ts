import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';

export type InvitationDirection = 'received' | 'sent';
export type RelationStatus =
  'none' | 'friend' | 'request_sent' | 'request_received' | 'blocked' | 'blocked_by_them' | 'self';

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

export type FriendRequestViewModel = {
  id: string;
  direction: InvitationDirection;
  otherUserId: string;
  otherUserName: string | null;
  otherUserAvatarUrl: string | null;
  createdAt: string | null;
  canRespond: boolean;
};

export type FriendViewModel = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string | null;
};

export type RecentCompanionViewModel = FriendViewModel & {
  lastAdventureTitle: string;
  lastActivityAt: string | null;
};

export type BlockedUserViewModel = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string | null;
};

export type SocialSearchResultViewModel = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  relationStatus: RelationStatus;
};

export type AvailableAdventureViewModel = {
  id: string;
  title: string;
  status: string;
};

export type InvitationsPageData = {
  received: InvitationViewModel[];
  sent: InvitationViewModel[];
  receivedFriendRequests: FriendRequestViewModel[];
  sentFriendRequests: FriendRequestViewModel[];
  friends: FriendViewModel[];
  recentCompanions: RecentCompanionViewModel[];
  blockedUsers: BlockedUserViewModel[];
  availableAdventures: AvailableAdventureViewModel[];
  invitationBackendAvailable: boolean;
};

type ProfileRow = {
  id?: unknown;
  display_name?: unknown;
  avatar_url?: unknown;
};

type FriendRequestRow = {
  id?: unknown;
  requester_id?: unknown;
  recipient_id?: unknown;
  created_at?: unknown;
  requester?: ProfileRow | ProfileRow[] | null;
  recipient?: ProfileRow | ProfileRow[] | null;
};

type FriendshipRow = {
  user_low_id?: unknown;
  user_high_id?: unknown;
  created_at?: unknown;
  low?: ProfileRow | ProfileRow[] | null;
  high?: ProfileRow | ProfileRow[] | null;
};

type GameRow = {
  id?: unknown;
  title?: unknown;
  status?: unknown;
  game_players?: GamePlayerRow[] | null;
};

type GamePlayerRow = {
  abandoned_at?: unknown;
};

type GameInvitationRow = {
  id?: unknown;
  game_id?: unknown;
  sender_id?: unknown;
  recipient_id?: unknown;
  status?: unknown;
  created_at?: unknown;
  sender?: ProfileRow | ProfileRow[] | null;
  recipient?: ProfileRow | ProfileRow[] | null;
  games?: GameRow | GameRow[] | null;
};

type BlockRow = {
  blocked_id?: unknown;
  created_at?: unknown;
  blocked?: ProfileRow | ProfileRow[] | null;
};

type SearchRow = {
  id?: unknown;
  display_name?: unknown;
  avatar_url?: unknown;
  relation_status?: unknown;
};

@Injectable({ providedIn: 'root' })
export class InvitationsService {
  private readonly auth = inject(AuthService);

  async load(): Promise<InvitationsPageData> {
    const client = this.auth.supabase;
    const userId = this.auth.user()?.id;
    if (!client || !userId) return this.emptyData(Boolean(client));

    const [friendRequests, friendships, gameInvitations, blocks, games] = await Promise.all([
      client
        .from('friend_requests')
        .select(
          `
            id,
            requester_id,
            recipient_id,
            created_at,
            requester:profiles!friend_requests_requester_id_fkey(id, display_name, avatar_url),
            recipient:profiles!friend_requests_recipient_id_fkey(id, display_name, avatar_url)
          `,
        )
        .order('created_at', { ascending: false }),
      client
        .from('friendships')
        .select(
          `
            user_low_id,
            user_high_id,
            created_at,
            low:profiles!friendships_user_low_id_fkey(id, display_name, avatar_url),
            high:profiles!friendships_user_high_id_fkey(id, display_name, avatar_url)
          `,
        )
        .order('created_at', { ascending: false }),
      client
        .from('game_invitations')
        .select(
          `
            id,
            game_id,
            sender_id,
            recipient_id,
            status,
            created_at,
            sender:profiles!game_invitations_sender_id_fkey(id, display_name, avatar_url),
            recipient:profiles!game_invitations_recipient_id_fkey(id, display_name, avatar_url),
            games(id, title, status)
          `,
        )
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      client
        .from('user_blocks')
        .select(
          `
            blocked_id,
            created_at,
            blocked:profiles!user_blocks_blocked_id_fkey(id, display_name, avatar_url)
          `,
        )
        .order('created_at', { ascending: false }),
      client
        .from('games')
        .select('id, title, status, game_players(player_id, abandoned_at)')
        .in('status', ['waiting', 'character_creation', 'ready'])
        .order('updated_at', { ascending: false }),
    ]);

    this.throwFirstError(
      friendRequests.error,
      friendships.error,
      gameInvitations.error,
      blocks.error,
      games.error,
    );

    const friends = this.mapFriends((friendships.data ?? []) as FriendshipRow[], userId);

    return {
      received: this.mapGameInvitations(
        (gameInvitations.data ?? []) as GameInvitationRow[],
        userId,
        'received',
      ),
      sent: this.mapGameInvitations(
        (gameInvitations.data ?? []) as GameInvitationRow[],
        userId,
        'sent',
      ),
      receivedFriendRequests: this.mapFriendRequests(
        (friendRequests.data ?? []) as FriendRequestRow[],
        userId,
        'received',
      ),
      sentFriendRequests: this.mapFriendRequests(
        (friendRequests.data ?? []) as FriendRequestRow[],
        userId,
        'sent',
      ),
      friends,
      recentCompanions: friends.map((friend) => ({
        ...friend,
        lastAdventureTitle: 'Aucune aventure commune recente',
        lastActivityAt: friend.createdAt,
      })),
      blockedUsers: this.mapBlocks((blocks.data ?? []) as BlockRow[]),
      availableAdventures: ((games.data ?? []) as GameRow[]).flatMap((game) => {
        const id = this.stringValue(game.id);
        const title = this.stringValue(game.title);
        const status = this.stringValue(game.status);
        const activePlayerCount = (game.game_players ?? []).filter(
          (player) => player.abandoned_at === null,
        ).length;
        if (activePlayerCount >= 2) return [];
        return id && title && status ? [{ id, title, status }] : [];
      }),
      invitationBackendAvailable: true,
    };
  }

  async searchPlayers(query: string): Promise<SocialSearchResultViewModel[]> {
    const client = this.auth.supabase;
    if (!client || query.trim().length < 2) return [];

    const { data, error } = await client.rpc('search_social_profiles', {
      search_query: query,
      max_results: 8,
    });
    if (error) throw error;

    return ((data ?? []) as SearchRow[]).flatMap((row) => {
      const userId = this.stringValue(row.id);
      const displayName = this.stringValue(row.display_name);
      if (!userId || !displayName) return [];
      return [
        {
          userId,
          displayName,
          avatarUrl: this.stringValue(row.avatar_url),
          relationStatus: this.relationStatus(row.relation_status),
        },
      ];
    });
  }

  async sendFriendRequest(userId: string): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.rpc('send_friend_request', { target_user_id: userId });
    if (error) throw error;
  }

  async acceptFriendRequest(request: FriendRequestViewModel): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.rpc('accept_friend_request', { request_id: request.id });
    if (error) throw error;
  }

  async declineFriendRequest(request: FriendRequestViewModel): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.rpc('decline_friend_request', { request_id: request.id });
    if (error) throw error;
  }

  async cancelFriendRequest(request: FriendRequestViewModel): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.rpc('cancel_friend_request', { request_id: request.id });
    if (error) throw error;
  }

  async removeFriend(friend: FriendViewModel): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.rpc('remove_friend', { friend_user_id: friend.userId });
    if (error) throw error;
  }

  async blockUser(userId: string): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.rpc('block_user', { target_user_id: userId });
    if (error) throw error;
  }

  async unblockUser(userId: string): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.rpc('unblock_user', { target_user_id: userId });
    if (error) throw error;
  }

  async inviteFriendToGame(friend: FriendViewModel, adventureId: string): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.rpc('send_game_invitation', {
      target_game_id: adventureId,
      target_user_id: friend.userId,
    });
    if (error) throw error;
  }

  async accept(invitation: InvitationViewModel): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.rpc('accept_game_invitation', { invitation_id: invitation.id });
    if (error) throw error;
  }

  async refuse(invitation: InvitationViewModel): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.rpc('decline_game_invitation', { invitation_id: invitation.id });
    if (error) throw error;
  }

  async cancelGameInvitation(invitation: InvitationViewModel): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.rpc('cancel_game_invitation', { invitation_id: invitation.id });
    if (error) throw error;
  }

  private mapGameInvitations(
    rows: GameInvitationRow[],
    userId: string,
    direction: InvitationDirection,
  ): InvitationViewModel[] {
    return rows.flatMap((row) => {
      const senderId = this.stringValue(row.sender_id);
      const recipientId = this.stringValue(row.recipient_id);
      if (!senderId || !recipientId) return [];
      if (direction === 'received' && recipientId !== userId) return [];
      if (direction === 'sent' && senderId !== userId) return [];

      const otherProfile =
        direction === 'received' ? this.profile(row.sender) : this.profile(row.recipient);
      const game = this.single(row.games);
      const id = this.stringValue(row.id);
      const adventureId = this.stringValue(row.game_id);
      const adventureTitle = this.stringValue(game?.title);
      const status = this.stringValue(row.status) ?? 'pending';
      if (!id || !adventureId || !adventureTitle) return [];

      return [
        {
          id,
          direction,
          adventureId,
          adventureTitle,
          otherUserId: direction === 'received' ? senderId : recipientId,
          otherUserName: this.stringValue(otherProfile?.display_name),
          otherUserAvatarUrl: this.stringValue(otherProfile?.avatar_url),
          status,
          createdAt: this.validDate(this.stringValue(row.created_at)),
          coverImageUrl: '/images/dashboard/AventureEnCours.png',
          canRespond: direction === 'received' && status === 'pending',
        },
      ];
    });
  }

  private mapFriendRequests(
    rows: FriendRequestRow[],
    userId: string,
    direction: InvitationDirection,
  ): FriendRequestViewModel[] {
    return rows.flatMap((row) => {
      const requesterId = this.stringValue(row.requester_id);
      const recipientId = this.stringValue(row.recipient_id);
      if (!requesterId || !recipientId) return [];
      if (direction === 'received' && recipientId !== userId) return [];
      if (direction === 'sent' && requesterId !== userId) return [];
      const otherProfile =
        direction === 'received' ? this.profile(row.requester) : this.profile(row.recipient);
      const id = this.stringValue(row.id);
      if (!id) return [];
      return [
        {
          id,
          direction,
          otherUserId: direction === 'received' ? requesterId : recipientId,
          otherUserName: this.stringValue(otherProfile?.display_name),
          otherUserAvatarUrl: this.stringValue(otherProfile?.avatar_url),
          createdAt: this.validDate(this.stringValue(row.created_at)),
          canRespond: direction === 'received',
        },
      ];
    });
  }

  private mapFriends(rows: FriendshipRow[], userId: string): FriendViewModel[] {
    return rows.flatMap((row) => {
      const lowId = this.stringValue(row.user_low_id);
      const highId = this.stringValue(row.user_high_id);
      if (!lowId || !highId) return [];
      const friendId = lowId === userId ? highId : lowId;
      if (friendId === userId) return [];
      const profile = lowId === userId ? this.profile(row.high) : this.profile(row.low);
      const displayName = this.stringValue(profile?.display_name);
      if (!displayName) return [];
      return [
        {
          userId: friendId,
          displayName,
          avatarUrl: this.stringValue(profile?.avatar_url),
          createdAt: this.validDate(this.stringValue(row.created_at)),
        },
      ];
    });
  }

  private mapBlocks(rows: BlockRow[]): BlockedUserViewModel[] {
    return rows.flatMap((row) => {
      const userId = this.stringValue(row.blocked_id);
      const profile = this.profile(row.blocked);
      const displayName = this.stringValue(profile?.display_name);
      if (!userId || !displayName) return [];
      return [
        {
          userId,
          displayName,
          avatarUrl: this.stringValue(profile?.avatar_url),
          createdAt: this.validDate(this.stringValue(row.created_at)),
        },
      ];
    });
  }

  private emptyData(backendAvailable = false): InvitationsPageData {
    return {
      received: [],
      sent: [],
      receivedFriendRequests: [],
      sentFriendRequests: [],
      friends: [],
      recentCompanions: [],
      blockedUsers: [],
      availableAdventures: [],
      invitationBackendAvailable: backendAvailable,
    };
  }

  private throwFirstError(...errors: Array<unknown>): void {
    const error = errors.find(Boolean);
    if (error) throw error;
  }

  private requireClient() {
    const client = this.auth.supabase;
    if (!client) throw new Error('Backend social indisponible en mode demonstration.');
    return client;
  }

  private relationStatus(value: unknown): RelationStatus {
    return value === 'friend' ||
      value === 'request_sent' ||
      value === 'request_received' ||
      value === 'blocked' ||
      value === 'blocked_by_them' ||
      value === 'self'
      ? value
      : 'none';
  }

  private profile(value: ProfileRow | ProfileRow[] | null | undefined): ProfileRow | null {
    return this.single(value);
  }

  private single<T>(value: T | T[] | null | undefined): T | null {
    return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
  }

  private validDate(value: string | null): string | null {
    if (!value) return null;
    return Number.isFinite(Date.parse(value)) ? value : null;
  }

  private stringValue(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }
}
