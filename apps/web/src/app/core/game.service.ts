import { computed, inject, Injectable, signal } from '@angular/core';
import { characterInputSchema, worldDefinitionSchema } from '@odyssee/domain';
import type { Character, WorldDefinition } from '@odyssee/domain';
import { AuthService } from './auth.service';

export type GameSummary = {
  id: string;
  title: string;
  inviteCode: string;
  status: string;
  playMode: 'realtime' | 'asynchronous';
  turnNumber: number;
  updatedAt: string;
};

export type GameDraft = {
  title: string;
  playMode: 'realtime' | 'asynchronous';
  timerSeconds: number | null;
  world: WorldDefinition;
};

export type TurnSubmissionStatus = { playerId: string; submitted: boolean };

export type LocalAdventure = GameSummary & {
  ownerId: string;
  playerIds: string[];
  timerSeconds: number | null;
  world: WorldDefinition;
  characters: Character[];
  goals: Array<{
    id: string;
    characterId: string;
    visibility: 'public' | 'private';
    description: string;
  }>;
  turns: Array<{
    id: string;
    number: number;
    scene: string;
    location: string;
    resolution: string | null;
    intentions: Record<string, Array<{ id: string; label: string; description: string }>>;
    decisions: Array<{ playerId: string; characterId: string; actionText: string; source: string }>;
    createdAt: string;
  }>;
  memories: Array<{
    id: string;
    type: string;
    title: string;
    summary: string;
    importance: number;
    createdAt: string;
  }>;
};

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly auth = inject(AuthService);
  private readonly localGames = signal<LocalAdventure[]>(this.readLocalGames());
  readonly games = computed<GameSummary[]>(() =>
    this.localGames()
      .filter((game) => game.playerIds.includes(this.requireUser().id))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );

  async refresh(): Promise<void> {
    const client = this.auth.supabase;
    if (!client) {
      this.localGames.set(this.readLocalGames());
      return;
    }
    const { data, error } = await client
      .from('games')
      .select('id,title,invite_code,status,play_mode,turn_number,updated_at')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    const summaries = (data ?? []).map((row) => ({
      id: String(row.id),
      title: String(row.title),
      inviteCode: String(row.invite_code),
      status: String(row.status),
      playMode: row.play_mode as 'realtime' | 'asynchronous',
      turnNumber: Number(row.turn_number),
      updatedAt: String(row.updated_at),
    }));
    this.localGames.set(summaries.map((summary) => this.summaryAsAdventure(summary)));
  }

  async createGame(draft: GameDraft): Promise<string> {
    worldDefinitionSchema.parse(draft.world);
    const user = this.requireUser();
    const client = this.auth.supabase;
    if (client) {
      const { data, error } = await client.rpc('create_game', {
        game_title: draft.title,
        selected_play_mode: draft.playMode,
        selected_timer_seconds: draft.timerSeconds,
        world_definition: draft.world,
      });
      if (error) throw error;
      return String(data);
    }
    const now = new Date().toISOString();
    const game: LocalAdventure = {
      id: crypto.randomUUID(),
      title: draft.title,
      inviteCode: this.inviteCode(),
      ownerId: user.id,
      playerIds: [user.id],
      status: 'waiting',
      playMode: draft.playMode,
      timerSeconds: draft.timerSeconds,
      turnNumber: 0,
      updatedAt: now,
      world: draft.world,
      characters: [],
      goals: [],
      turns: [],
      memories: [],
    };
    this.save([...this.localGames(), game]);
    return game.id;
  }

  async join(code: string): Promise<string> {
    const client = this.auth.supabase;
    if (client) {
      const { data, error } = await client.rpc('join_game_by_code', { code: code.trim() });
      if (error) throw error;
      return String(data);
    }
    const user = this.requireUser();
    const games = this.readLocalGames();
    this.localGames.set(games);
    const game = games.find((item) => item.inviteCode === code.trim().toUpperCase());
    if (!game) throw new Error('Code invalide ou expiré.');
    if (!game.playerIds.includes(user.id) && game.playerIds.length >= 2)
      throw new Error('Cette aventure est complète.');
    if (game.status !== 'waiting' && !game.playerIds.includes(user.id))
      throw new Error('Cette aventure a déjà commencé.');
    this.patchLocal(game.id, {
      playerIds: [...new Set([...game.playerIds, user.id])],
      status: 'character_creation',
    });
    return game.id;
  }

  async deleteGameForAll(gameId: string): Promise<'deleted' | 'already_deleted'> {
    const client = this.auth.supabase;
    if (client) {
      const { data, error } = await client.rpc('delete_game_for_all', {
        target_game_id: gameId,
      });
      if (error) throw error;
      await this.refresh();
      return String(data) === 'already_deleted' ? 'already_deleted' : 'deleted';
    }
    const games = this.readLocalGames();
    const existing = games.find((game) => game.id === gameId);
    if (!existing) return 'already_deleted';
    if (!existing.playerIds.includes(this.requireUser().id)) throw new Error('forbidden');
    this.save(games.filter((game) => game.id !== gameId));
    return 'deleted';
  }

  isGameMissingError(error: unknown): boolean {
    if (error instanceof Error && error.message.includes('Partie introuvable')) return true;
    if (!error || typeof error !== 'object') return false;
    const candidate = error as Record<string, unknown>;
    const code = typeof candidate['code'] === 'string' ? candidate['code'] : '';
    const message = typeof candidate['message'] === 'string' ? candidate['message'] : '';
    return (
      code === 'PGRST116' || message.includes('0 rows') || message.includes('JSON object requested')
    );
  }

  async load(id: string): Promise<LocalAdventure> {
    const client = this.auth.supabase;
    if (!client) {
      const storedGames = this.readLocalGames();
      this.localGames.set(storedGames);
      const game = storedGames.find((item) => item.id === id);
      if (!game || !game.playerIds.includes(this.requireUser().id))
        throw new Error('Partie introuvable.');
      return game;
    }
    const { data: game, error } = await client.from('games').select('*').eq('id', id).single();
    if (error) throw error;
    const [world, characters, goals, turns, memories, players] = await Promise.all([
      client.from('world_states').select('*').eq('game_id', id).single(),
      client.from('characters').select('*').eq('game_id', id),
      client.from('character_goals').select('*').eq('game_id', id),
      client
        .from('story_turns')
        .select('*,player_decisions(*)')
        .eq('game_id', id)
        .order('turn_number'),
      client.from('memories').select('*').eq('game_id', id).order('created_at'),
      client.from('game_players').select('player_id').eq('game_id', id),
    ]);
    if (
      world.error ||
      characters.error ||
      goals.error ||
      turns.error ||
      memories.error ||
      players.error
    )
      throw (
        world.error ??
        characters.error ??
        goals.error ??
        turns.error ??
        memories.error ??
        players.error
      );
    return {
      id,
      title: String(game.title),
      inviteCode: String(game.invite_code),
      ownerId: String(game.owner_id),
      playerIds: (players.data ?? []).map((row) => String(row.player_id)),
      status: String(game.status),
      playMode: game.play_mode as 'realtime' | 'asynchronous',
      timerSeconds: game.timer_seconds as number | null,
      turnNumber: Number(game.turn_number),
      updatedAt: String(game.updated_at),
      world: (world.data?.definition ?? {}) as WorldDefinition,
      characters: (characters.data ?? []).map((row) => this.mapCharacter(row)),
      goals: (goals.data ?? []).map((row) => ({
        id: String(row.id),
        characterId: String(row.character_id),
        visibility: row.visibility as 'public' | 'private',
        description: String(row.description),
      })),
      turns: (turns.data ?? []).map((row) => ({
        id: String(row.id),
        number: Number(row.turn_number),
        scene: String(row.scene_text),
        location: String(row.location ?? ''),
        resolution: row.resolution_text ? String(row.resolution_text) : null,
        intentions: (row.proposed_intentions ??
          {}) as LocalAdventure['turns'][number]['intentions'],
        decisions: ((row.player_decisions ?? []) as Array<Record<string, unknown>>).map(
          (decision) => ({
            playerId: String(decision['player_id']),
            characterId: String(decision['character_id']),
            actionText: String(decision['action_text']),
            source: String(decision['source']),
          }),
        ),
        createdAt: String(row.created_at),
      })),
      memories: (memories.data ?? []).map((row) => ({
        id: String(row.id),
        type: String(row.type),
        title: String(row.title),
        summary: String(row.summary),
        importance: Number(row.importance),
        createdAt: String(row.created_at),
      })),
    };
  }

  async saveCharacter(
    gameId: string,
    input: Omit<Character, 'id' | 'gameId' | 'ownerId' | 'createdAt' | 'updatedAt'>,
  ): Promise<void> {
    characterInputSchema.parse({
      name: input.name,
      pronouns: input.pronouns,
      ageDescription: input.ageDescription,
      appearance: input.appearance,
      personalityTraits: input.personalityTraits,
      values: input.values,
      fears: input.fears,
      strengths: input.strengths,
      weaknesses: input.weaknesses,
      backstory: input.backstory,
      freeformDescription: input.freeformDescription,
    });
    const user = this.requireUser();
    const client = this.auth.supabase;
    if (client) {
      const { error } = await client.from('characters').upsert(
        {
          game_id: gameId,
          owner_id: user.id,
          name: input.name,
          pronouns: input.pronouns,
          age_description: input.ageDescription,
          appearance: input.appearance,
          personality_traits: input.personalityTraits,
          values_list: input.values,
          fears: input.fears,
          strengths: input.strengths,
          weaknesses: input.weaknesses,
          backstory: input.backstory,
          freeform_description: input.freeformDescription,
          current_emotional_state: input.currentEmotionalState,
          avatar_url: input.avatarUrl,
          is_final: true,
        },
        { onConflict: 'game_id,owner_id' },
      );
      if (error) throw error;
      await this.startIfReady(gameId);
      return;
    }
    const game = await this.load(gameId);
    const now = new Date().toISOString();
    const existing = game.characters.find((character) => character.ownerId === user.id);
    const character: Character = {
      ...input,
      id: existing?.id ?? crypto.randomUUID(),
      gameId,
      ownerId: user.id,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const characters = [...game.characters.filter((item) => item.ownerId !== user.id), character];
    const ready =
      characters.length === 2 || (game.playerIds.length === 1 && game.id === 'demo-adventure');
    this.patchLocal(gameId, { characters, status: ready ? 'ready' : 'character_creation' });
    if (ready) this.ensureOpening(gameId);
  }

  async submitDecision(
    gameId: string,
    actionText: string,
    source: 'suggested' | 'freeform' | 'timeout',
    intentionId: string | null,
  ): Promise<void> {
    const user = this.requireUser();
    const game = await this.load(gameId);
    const turn = game.turns.at(-1);
    const character =
      game.characters.find((item) => item.ownerId === user.id) ?? game.characters[0];
    if (!turn || !character) throw new Error('Le tour ou le personnage est introuvable.');
    if (turn.decisions.some((decision) => decision.playerId === user.id))
      throw new Error('Votre décision est déjà verrouillée.');
    const client = this.auth.supabase;
    if (client) {
      const { error } = await client.from('player_decisions').insert({
        game_id: gameId,
        turn_id: turn.id,
        player_id: user.id,
        character_id: character.id,
        source,
        intention_id: intentionId,
        action_text: actionText,
      });
      if (error) throw error;
      await this.resolveTurn(turn.id);
      return;
    }
    const decisions = [
      ...turn.decisions,
      { playerId: user.id, characterId: character.id, actionText, source },
    ];
    if (game.playerIds.length === 1 || game.id === 'demo-adventure') {
      const partner = game.characters.find((item) => item.id !== character.id) ?? character;
      decisions.push({
        playerId: 'demo-partner',
        characterId: partner.id,
        actionText: 'recouper silencieusement les archives',
        source: 'suggested',
      });
    }
    const updatedTurns = game.turns.map((item) =>
      item.id === turn.id ? { ...item, decisions } : item,
    );
    this.patchLocal(gameId, { turns: updatedTurns });
    if (decisions.length >= 2) this.resolveLocal(gameId, turn.id);
  }

  async startIfReady(
    gameId: string,
  ): Promise<'started' | 'already_started' | 'waiting_for_characters'> {
    const client = this.auth.supabase;
    if (!client) {
      this.ensureOpening(gameId);
      const game = await this.load(gameId);
      return game.status === 'active' ? 'started' : 'waiting_for_characters';
    }
    const { data, error } = await client.rpc('start_game_if_ready', { target_game_id: gameId });
    if (error) throw error;
    return String(data) as 'started' | 'already_started' | 'waiting_for_characters';
  }

  async getTurnSubmissionStatus(gameId: string, turnId: string): Promise<TurnSubmissionStatus[]> {
    const client = this.auth.supabase;
    if (!client) {
      const game = await this.load(gameId);
      const turn = game.turns.find((item) => item.id === turnId);
      return game.playerIds.map((playerId) => ({
        playerId,
        submitted: turn?.decisions.some((decision) => decision.playerId === playerId) ?? false,
      }));
    }
    const { data, error } = await client.rpc('get_turn_submission_status', {
      target_turn_id: turnId,
    });
    if (error) throw error;
    const statuses = (data ?? []) as Array<{ player_id: unknown; submitted: unknown }>;
    return statuses.map((status) => ({
      playerId: String(status.player_id),
      submitted: Boolean(status.submitted),
    }));
  }

  async resolveCurrentTurn(gameId: string): Promise<string> {
    const game = await this.load(gameId);
    const turn = game.turns.at(-1);
    if (!turn) throw new Error('Aucun tour actif.');
    return this.resolveTurn(turn.id);
  }

  private async resolveTurn(turnId: string): Promise<string> {
    const client = this.auth.supabase;
    if (!client) return 'mock_local';

    const { data, error } = await client.functions.invoke('resolve-turn', {
      body: { turnId },
    });
    if (error) throw error;
    return String((data as { status?: string } | null)?.status ?? 'requested');
  }

  createDemo(): string {
    const user = this.requireUser();
    const existing = this.localGames().find((game) => game.id === 'demo-adventure');
    if (existing) {
      if (!existing.playerIds.includes(user.id))
        this.patchLocal(existing.id, { playerIds: [...existing.playerIds, user.id] });
      return existing.id;
    }
    const now = new Date().toISOString();
    const base = (name: string, id: string, ownerId: string): Character => ({
      id,
      gameId: 'demo-adventure',
      ownerId,
      name,
      pronouns: null,
      ageDescription: null,
      appearance: 'Silhouette découpée par les néons de Nacre.',
      personalityTraits: ['curieux', 'déterminé'],
      values: ['vérité'],
      fears: ['perdre sa mémoire'],
      strengths: ['observation'],
      weaknesses: ['méfiance'],
      backstory: 'La disparition de Sora Elian a changé sa trajectoire.',
      freeformDescription: '',
      currentEmotionalState: ['vigilance'],
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
    });
    const mara = base('Mara Venn', 'demo-mara', user.id);
    const ilyon = base('Ilyon-7', 'demo-ilyon', 'demo-partner');
    const game: LocalAdventure = {
      id: 'demo-adventure',
      title: 'Les Échos de Nacre',
      inviteCode: 'NACRE-27',
      ownerId: user.id,
      playerIds: [user.id],
      status: 'active',
      playMode: 'asynchronous',
      timerSeconds: null,
      turnNumber: 1,
      updatedAt: now,
      world: {
        genre: 'Cité futuriste',
        customDescription: 'Une cité verticale où les souvenirs peuvent être archivés.',
        tone: ['mystère', 'émotion'],
        realismLevel: 'flexible',
        violenceLevel: 'light',
        romanceEnabled: false,
        characterDeathEnabled: false,
        customRules: [],
        forbiddenElements: [],
      },
      characters: [mara, ilyon],
      goals: [
        {
          id: 'goal-mara',
          characterId: mara.id,
          visibility: 'private',
          description: 'Découvrir la vérité sans sacrifier vos valeurs.',
        },
        {
          id: 'goal-ilyon',
          characterId: ilyon.id,
          visibility: 'private',
          description: 'Comprendre pourquoi certains souvenirs lui ont été retirés.',
        },
      ],
      turns: [this.openingTurn([mara, ilyon], now)],
      memories: [
        {
          id: 'memory-0',
          type: 'discovery',
          title: 'La disparition de Sora',
          summary:
            'La scientifique Sora Elian a disparu après avoir laissé un message contradictoire.',
          importance: 8,
          createdAt: now,
        },
      ],
    };
    this.save([...this.localGames(), game]);
    return game.id;
  }

  private ensureOpening(gameId: string): void {
    const game = this.localGames().find((item) => item.id === gameId);
    if (!game || game.turns.length || game.characters.length !== 2) return;
    const now = new Date().toISOString();
    const goals = game.characters.map((character, index) => ({
      id: crypto.randomUUID(),
      characterId: character.id,
      visibility: 'private' as const,
      description: index
        ? 'Comprendre ce que votre partenaire ne parvient pas encore à dire.'
        : 'Découvrir la vérité sans sacrifier vos valeurs.',
    }));
    this.patchLocal(gameId, {
      status: 'active',
      turnNumber: 1,
      goals,
      turns: [this.openingTurn(game.characters, now)],
    });
  }

  private openingTurn(characters: Character[], now: string): LocalAdventure['turns'][number] {
    const intentionEntries: Array<
      [string, Array<{ id: string; label: string; description: string }>]
    > = characters.map((character) => [
      character.id,
      [
        {
          id: `${character.id}-observe`,
          label: 'Observer les détails',
          description: 'Lire les signes discrets de la scène.',
        },
        {
          id: `${character.id}-initiative`,
          label: 'Prendre l’initiative',
          description: 'Agir directement selon ses valeurs.',
        },
      ],
    ]);
    return {
      id: crypto.randomUUID(),
      number: 1,
      scene:
        'La pluie dessine des lignes de lumière sur le laboratoire désert. La chercheuse Sora Elian a disparu, mais son terminal vient de se rallumer : « Ne faites confiance ni au silence, ni à ma voix. »',
      location: 'Laboratoire des Hautes-Strates',
      resolution: null,
      intentions: Object.fromEntries(intentionEntries),
      decisions: [],
      createdAt: now,
    };
  }

  private resolveLocal(gameId: string, turnId: string): void {
    const game = this.localGames().find((item) => item.id === gameId);
    const turn = game?.turns.find((item) => item.id === turnId);
    if (!game || !turn || turn.resolution) return;
    const [first, second] = turn.decisions;
    const resolution = `Tandis que l’un choisit de ${first?.actionText.toLocaleLowerCase()}, l’autre décide de ${second?.actionText.toLocaleLowerCase()}. Les deux initiatives se complètent et révèlent une route vers les jardins orbitaux, sans lever tous les doutes.`;
    const nextNumber = turn.number + 1;
    const next: LocalAdventure['turns'][number] = {
      id: crypto.randomUUID(),
      number: nextNumber,
      scene:
        'Une navette attend, portes ouvertes, à destination des jardins orbitaux. Quelqu’un a préparé leur arrivée.',
      location: 'Quai des Jardins orbitaux',
      resolution: null,
      intentions: Object.fromEntries(
        game.characters.map((character) => [
          character.id,
          [
            {
              id: `${character.id}-${nextNumber}-dialogue`,
              label: 'Questionner le pilote',
              description: 'Chercher une explication avant le départ.',
            },
            {
              id: `${character.id}-${nextNumber}-board`,
              label: 'Monter à bord',
              description: 'Accepter le risque et suivre la piste.',
            },
          ],
        ]),
      ),
      decisions: [],
      createdAt: new Date().toISOString(),
    };
    this.patchLocal(gameId, {
      turnNumber: nextNumber,
      updatedAt: new Date().toISOString(),
      turns: [
        ...game.turns.map((item) => (item.id === turnId ? { ...item, resolution } : item)),
        next,
      ],
      memories: [
        ...game.memories,
        {
          id: crypto.randomUUID(),
          type: 'discovery',
          title: `La piste du tour ${turn.number}`,
          summary: 'Leurs initiatives combinées ont révélé l’accès aux jardins orbitaux.',
          importance: 7,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  }

  private mapCharacter(row: Record<string, unknown>): Character {
    return {
      id: String(row['id']),
      gameId: String(row['game_id']),
      ownerId: String(row['owner_id']),
      name: String(row['name']),
      pronouns: row['pronouns'] ? String(row['pronouns']) : null,
      ageDescription: row['age_description'] ? String(row['age_description']) : null,
      appearance: String(row['appearance']),
      personalityTraits: row['personality_traits'] as string[],
      values: row['values_list'] as string[],
      fears: row['fears'] as string[],
      strengths: row['strengths'] as string[],
      weaknesses: row['weaknesses'] as string[],
      backstory: String(row['backstory']),
      freeformDescription: String(row['freeform_description']),
      currentEmotionalState: row['current_emotional_state'] as string[],
      avatarUrl: row['avatar_url'] ? String(row['avatar_url']) : null,
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    };
  }

  private patchLocal(id: string, patch: Partial<LocalAdventure>): void {
    this.save(
      this.localGames().map((game) =>
        game.id === id ? { ...game, ...patch, updatedAt: new Date().toISOString() } : game,
      ),
    );
  }
  private save(games: LocalAdventure[]): void {
    localStorage.setItem('odyssee_games_v1', JSON.stringify(games));
    this.localGames.set(games);
  }
  private readLocalGames(): LocalAdventure[] {
    try {
      return JSON.parse(localStorage.getItem('odyssee_games_v1') ?? '[]') as LocalAdventure[];
    } catch {
      return [];
    }
  }
  private requireUser() {
    const user = this.auth.user();
    if (!user) throw new Error('Authentification requise.');
    return user;
  }
  private inviteCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const values = crypto.getRandomValues(new Uint8Array(8));
    return `${Array.from(values.slice(0, 4), (value) => alphabet[value % alphabet.length]).join('')}-${Array.from(values.slice(4), (value) => alphabet[value % alphabet.length]).join('')}`;
  }
  private summaryAsAdventure(summary: GameSummary): LocalAdventure {
    return {
      ...summary,
      ownerId: '',
      playerIds: [this.requireUser().id],
      timerSeconds: null,
      world: {
        genre: '',
        customDescription: '',
        tone: [],
        realismLevel: 'flexible',
        violenceLevel: 'light',
        romanceEnabled: false,
        characterDeathEnabled: false,
        customRules: [],
        forbiddenElements: [],
      },
      characters: [],
      goals: [],
      turns: [],
      memories: [],
    };
  }
}
