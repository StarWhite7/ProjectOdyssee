import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { GameService } from './game.service';
import type { GameSummary } from './game.service';

export type ArchiveSort = 'recent' | 'oldest' | 'alpha';
export type ArchiveFilter = 'all' | 'completed';

export type ArchiveCompanion = {
  name: string;
  avatarUrl: string | null;
};

export type ArchiveViewModel = {
  id: string;
  title: string;
  rawStatus: string;
  route: unknown[];
  coverImageUrl: string;
  companion: ArchiveCompanion | null;
  completedAt: string | null;
  createdAt: string | null;
  chapterCount: number | null;
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

type SupabaseGameRow = {
  id?: unknown;
  title?: unknown;
  status?: unknown;
  turn_number?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  game_players?: SupabaseGamePlayerRow[] | null;
};

type SupabaseTurnRow = {
  game_id?: unknown;
};

const ARCHIVE_STATUSES = ['completed', 'finished', 'archived'] as const;
const ARCHIVE_COVER = '/images/dashboard/DernierAventure.png';

@Injectable({ providedIn: 'root' })
export class ArchivesService {
  private readonly auth = inject(AuthService);
  private readonly games = inject(GameService);

  async load(): Promise<ArchiveViewModel[]> {
    const client = this.auth.supabase;
    const userId = this.auth.user()?.id;
    if (!userId) return [];

    if (!client) {
      await this.games.refresh();
      return this.games
        .games()
        .filter((game) => this.isArchiveStatus(game.status))
        .map((game) => this.fromSummary(game));
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

    if (!gameIds.length) return [];

    const { data: games, error: gamesError } = await client
      .from('games')
      .select(
        `
          id,
          title,
          status,
          turn_number,
          created_at,
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
      .in('status', [...ARCHIVE_STATUSES])
      .order('updated_at', { ascending: false });

    if (gamesError) throw gamesError;

    const archiveRows = (games ?? []) as SupabaseGameRow[];
    const archiveIds = archiveRows
      .map((game) => this.stringValue(game.id))
      .filter((id): id is string => Boolean(id));
    const chapterCounts = await this.chapterCounts(archiveIds);

    return archiveRows.map((game) => this.fromSupabaseGame(game, userId, chapterCounts));
  }

  filterAndSort(
    archives: ArchiveViewModel[],
    searchTerm: string,
    sort: ArchiveSort,
    filter: ArchiveFilter,
  ): ArchiveViewModel[] {
    const query = searchTerm.trim().toLocaleLowerCase('fr-FR');
    const filteredByTab =
      filter === 'completed'
        ? archives.filter((archive) => archive.rawStatus === 'completed')
        : archives;
    const filteredBySearch = query
      ? filteredByTab.filter((archive) =>
          [archive.title, archive.companion?.name ?? ''].some((value) =>
            value.toLocaleLowerCase('fr-FR').includes(query),
          ),
        )
      : filteredByTab;

    return [...filteredBySearch].sort((a, b) => this.compare(a, b, sort));
  }

  hasCompletedOnly(archives: ArchiveViewModel[]): boolean {
    return archives.every((archive) => archive.rawStatus === 'completed');
  }

  private async chapterCounts(gameIds: string[]): Promise<Map<string, number>> {
    const client = this.auth.supabase;
    if (!client || !gameIds.length) return new Map();

    const { data, error } = await client.from('story_turns').select('game_id').in('game_id', gameIds);
    if (error) throw error;

    const counts = new Map<string, number>();
    for (const row of (data ?? []) as SupabaseTurnRow[]) {
      const gameId = this.stringValue(row.game_id);
      if (!gameId) continue;
      counts.set(gameId, (counts.get(gameId) ?? 0) + 1);
    }
    return counts;
  }

  private fromSummary(game: GameSummary): ArchiveViewModel {
    return {
      id: game.id,
      title: game.title.trim() || 'Aventure sans titre',
      rawStatus: game.status,
      route: ['/aventure', game.id, 'journal'],
      coverImageUrl: ARCHIVE_COVER,
      companion: null,
      completedAt: this.validDate(game.updatedAt),
      createdAt: null,
      chapterCount: game.turnNumber > 0 ? game.turnNumber : null,
    };
  }

  private fromSupabaseGame(
    game: SupabaseGameRow,
    userId: string,
    chapterCounts: Map<string, number>,
  ): ArchiveViewModel {
    const id = this.stringValue(game.id) ?? '';
    const count = chapterCounts.get(id) ?? this.numberValue(game.turn_number);
    return {
      id,
      title: this.stringValue(game.title)?.trim() || 'Aventure sans titre',
      rawStatus: this.stringValue(game.status) ?? '',
      route: ['/aventure', id, 'journal'],
      coverImageUrl: ARCHIVE_COVER,
      companion: this.companionFromPlayers(game.game_players ?? [], userId),
      completedAt: this.validDate(this.stringValue(game.updated_at)),
      createdAt: this.validDate(this.stringValue(game.created_at)),
      chapterCount: count > 0 ? count : null,
    };
  }

  private companionFromPlayers(
    players: SupabaseGamePlayerRow[],
    userId: string,
  ): ArchiveCompanion | null {
    const companionPlayer = players.find((player) => this.stringValue(player.player_id) !== userId);
    if (!companionPlayer) return null;
    const profile = Array.isArray(companionPlayer.profiles)
      ? companionPlayer.profiles[0]
      : companionPlayer.profiles;
    const name = this.stringValue(profile?.display_name)?.trim();
    if (!name) return null;
    return {
      name,
      avatarUrl: this.stringValue(profile?.avatar_url),
    };
  }

  private isArchiveStatus(status: string): boolean {
    return (ARCHIVE_STATUSES as readonly string[]).includes(status);
  }

  private compare(a: ArchiveViewModel, b: ArchiveViewModel, sort: ArchiveSort): number {
    if (sort === 'alpha') return a.title.localeCompare(b.title, 'fr-FR');
    const aTime = a.completedAt ? Date.parse(a.completedAt) : 0;
    const bTime = b.completedAt ? Date.parse(b.completedAt) : 0;
    return sort === 'oldest' ? aTime - bTime : bTime - aTime;
  }

  private validDate(value: string | null): string | null {
    if (!value) return null;
    return Number.isFinite(Date.parse(value)) ? value : null;
  }

  private stringValue(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private numberValue(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }
}
