import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import {
  GAME_STATUSES,
  gameStatusLabel,
  getMyAdventureRouteSection,
  isActiveGameStatus,
  isCompletedGameStatus,
  isPendingGameStatus,
} from './game-status';
import { GameService } from './game.service';
import type { GameSummary } from './game.service';

export type MyAdventureSort = 'recent' | 'oldest' | 'alpha';
export type MyAdventureGroup = 'active' | 'pending' | 'completed';

export type AdventureCompanion = {
  name: string;
  avatarUrl: string | null;
};

export type MyAdventureViewModel = {
  id: string;
  title: string;
  rawStatus: string;
  group: MyAdventureGroup;
  statusLabel: string;
  actionLabel: 'Continuer' | 'Consulter';
  route: unknown[];
  companion: AdventureCompanion | null;
  lastActivityAt: string | null;
  turnNumber: number;
  coverImageUrl: string;
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
  play_mode?: unknown;
  turn_number?: unknown;
  updated_at?: unknown;
  game_players?: SupabaseGamePlayerRow[] | null;
};

const FALLBACK_COVERS = {
  active: '/images/dashboard/AventureEnCours.png',
  pending: '/images/dashboard/DernierAventure.png',
  completed: '/images/dashboard/DernierAventure.png',
} as const;

@Injectable({ providedIn: 'root' })
export class MyAdventuresService {
  private readonly auth = inject(AuthService);
  private readonly games = inject(GameService);

  async load(): Promise<MyAdventureViewModel[]> {
    const client = this.auth.supabase;
    const userId = this.auth.user()?.id;
    if (!userId) return [];

    if (!client) {
      await this.games.refresh();
      return this.games.games().map((game) => this.fromSummary(game, userId));
    }

    const { data: memberships, error: membershipError } = await client
      .from('game_players')
      .select('game_id')
      .eq('player_id', userId)
      .is('abandoned_at', null);

    if (membershipError) throw membershipError;

    const gameIds = ((memberships ?? []) as SupabaseMemberRow[])
      .map((row) => this.stringValue(row.game_id))
      .filter((id): id is string => Boolean(id));

    if (!gameIds.length) return [];

    const { data: games, error: gamesError } = await client
      .from('games')
      .select(
        `
          id,
          title,
          status,
          play_mode,
          turn_number,
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

    return ((games ?? []) as SupabaseGameRow[]).map((game) => this.fromSupabaseGame(game, userId));
  }

  filterAndSort(
    adventures: MyAdventureViewModel[],
    searchTerm: string,
    sort: MyAdventureSort,
  ): MyAdventureViewModel[] {
    const query = searchTerm.trim().toLocaleLowerCase('fr-FR');
    const filtered = query
      ? adventures.filter((adventure) =>
          [adventure.title, adventure.companion?.name ?? ''].some((value) =>
            value.toLocaleLowerCase('fr-FR').includes(query),
          ),
        )
      : adventures;

    return [...filtered].sort((a, b) => this.compare(a, b, sort));
  }

  isActiveAdventure(status: string): boolean {
    return isActiveGameStatus(status) || status === GAME_STATUSES.READY;
  }

  isPendingAdventure(status: string): boolean {
    return isPendingGameStatus(status);
  }

  isCompletedAdventure(status: string): boolean {
    return isCompletedGameStatus(status);
  }

  private fromSummary(game: GameSummary, userId: string): MyAdventureViewModel {
    void userId;
    return this.toViewModel({
      id: game.id,
      title: game.title,
      status: game.status,
      turnNumber: game.turnNumber,
      updatedAt: game.updatedAt,
      companion: null,
    });
  }

  private fromSupabaseGame(game: SupabaseGameRow, userId: string): MyAdventureViewModel {
    return this.toViewModel({
      id: this.stringValue(game.id) ?? '',
      title: this.stringValue(game.title) ?? '',
      status: this.stringValue(game.status) ?? '',
      turnNumber: this.numberValue(game.turn_number),
      updatedAt: this.stringValue(game.updated_at),
      companion: this.companionFromPlayers(game.game_players ?? [], userId),
    });
  }

  private toViewModel(input: {
    id: string;
    title: string;
    status: string;
    turnNumber: number;
    updatedAt: string | null;
    companion: AdventureCompanion | null;
  }): MyAdventureViewModel {
    const group = this.groupForStatus(input.status);
    return {
      id: input.id,
      title: input.title.trim() || 'Une aventure sans titre',
      rawStatus: input.status,
      group,
      statusLabel: this.statusLabel(input.status),
      actionLabel: group === 'completed' ? 'Consulter' : 'Continuer',
      route: this.routeFor(input.id, input.status, group),
      companion: input.companion,
      lastActivityAt: this.validDate(input.updatedAt),
      turnNumber: input.turnNumber,
      coverImageUrl: FALLBACK_COVERS[group],
    };
  }

  private groupForStatus(status: string): MyAdventureGroup {
    if (this.isCompletedAdventure(status)) return 'completed';
    if (this.isPendingAdventure(status)) return 'pending';
    return 'active';
  }

  private routeFor(id: string, status: string, group: MyAdventureGroup): unknown[] {
    void group;
    return ['/aventure', id, getMyAdventureRouteSection(status)];
  }

  private companionFromPlayers(
    players: SupabaseGamePlayerRow[],
    userId: string,
  ): AdventureCompanion | null {
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

  private statusLabel(status: string): string {
    return gameStatusLabel(status);
  }

  private compare(a: MyAdventureViewModel, b: MyAdventureViewModel, sort: MyAdventureSort): number {
    if (sort === 'alpha') return a.title.localeCompare(b.title, 'fr-FR');
    const aTime = a.lastActivityAt ? Date.parse(a.lastActivityAt) : 0;
    const bTime = b.lastActivityAt ? Date.parse(b.lastActivityAt) : 0;
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
