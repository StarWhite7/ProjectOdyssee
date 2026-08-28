import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { applyWorldPreset, createDefaultWorldSettings } from '@odyssee/domain';
import { AuthService } from './auth.service';
import { WorldSettingsService } from './world-settings.service';

type RealtimePayload = {
  eventType: string;
  new: Record<string, unknown>;
};

describe('WorldSettingsService', () => {
  const user = signal({ id: 'host-1', email: 'host@example.test', displayName: 'Host' });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('loads world settings through the dedicated RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: row(), error: null });
    configure({ rpc });

    const settings = await TestBed.inject(WorldSettingsService).load('game-1');

    expect(rpc).toHaveBeenCalledWith('get_game_world_settings', {
      target_game_id: 'game-1',
    });
    expect(settings).toEqual(
      expect.objectContaining({
        gameId: '550e8400-e29b-41d4-a716-446655440000',
        universeType: 'fantasy',
        forbiddenElements: ['torture'],
      }),
    );
  });

  it('maps Supabase timestamps with Z or offsets to camelCase fields', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: row({
        locked_at: null,
        created_at: '2026-08-28T00:12:34.123+00:00',
        updated_at: '2026-08-28T02:12:34+02:00',
      }),
      error: null,
    });
    configure({ rpc });

    const settings = await TestBed.inject(WorldSettingsService).load('game-1');

    expect(settings.createdAt).toBe('2026-08-28T00:12:34.123+00:00');
    expect(settings.updatedAt).toBe('2026-08-28T02:12:34+02:00');
    expect(settings.lockedAt).toBeNull();
  });

  it('rejects invalid Supabase timestamps instead of accepting arbitrary strings', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: row({ created_at: 'not-a-date' }),
      error: null,
    });
    configure({ rpc });

    await expect(TestBed.inject(WorldSettingsService).load('game-1')).rejects.toThrow();
  });

  it('saves structured values without constructing AI prompts in the frontend', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: row({ preset: 'cyberpunk' }), error: null });
    configure({ rpc });
    const settings = applyWorldPreset(
      createDefaultWorldSettings({ gameId: '550e8400-e29b-41d4-a716-446655440000' }),
      'cyberpunk',
    );

    await TestBed.inject(WorldSettingsService).save('550e8400-e29b-41d4-a716-446655440000', {
      ...settings,
      forbiddenElements: ['torture', 'animal_violence'],
      freeDescription: 'Une ville verticale sous surveillance.',
    });

    expect(rpc).toHaveBeenCalledWith(
      'save_game_world_settings',
      expect.objectContaining({
        target_game_id: '550e8400-e29b-41d4-a716-446655440000',
        selected_preset: 'cyberpunk',
        selected_universe_type: 'cyberpunk',
        selected_magic_level: 'none',
        selected_forbidden_elements: ['torture', 'animal_violence'],
        selected_free_description: 'Une ville verticale sous surveillance.',
      }),
    );
    expect(JSON.stringify(rpc.mock.calls)).not.toContain('REGLES FONDATRICES');
  });

  it('subscribes to realtime changes for the current game only', () => {
    const on = vi.fn().mockReturnThis();
    const subscribe = vi.fn().mockReturnValue({ unsubscribe: vi.fn() });
    const channel = vi.fn(() => ({ on, subscribe }));
    const removeChannel = vi.fn();
    configure({ channel, removeChannel });

    const unsubscribe = TestBed.inject(WorldSettingsService).subscribe('game-1', vi.fn());

    expect(channel).toHaveBeenCalledWith('world-settings:game-1');
    expect(on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        table: 'game_world_settings',
        filter: 'game_id=eq.game-1',
      }),
      expect.any(Function),
    );
    unsubscribe?.();
    expect(removeChannel).toHaveBeenCalled();
  });

  it('uses the same row mapping for realtime updates', () => {
    let realtimeHandler: ((payload: RealtimePayload) => void) | null = null;
    const on = vi.fn((_event, _filter, handler) => {
      realtimeHandler = handler;
      return { subscribe };
    });
    const subscribe = vi.fn().mockReturnValue({ unsubscribe: vi.fn() });
    const channel = vi.fn(() => ({ on, subscribe }));
    configure({ channel, removeChannel: vi.fn() });
    const onChange = vi.fn();

    TestBed.inject(WorldSettingsService).subscribe('game-1', onChange);
    expect(realtimeHandler).not.toBeNull();
    const handler = realtimeHandler as unknown as (payload: RealtimePayload) => void;
    handler({
      eventType: 'UPDATE',
      new: row({
        locked_at: '2026-08-28T00:12:34.123+00:00',
        created_at: '2026-08-28T00:00:00Z',
        updated_at: '2026-08-28T00:12:34.123+00:00',
      }),
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        lockedAt: '2026-08-28T00:12:34.123+00:00',
        createdAt: '2026-08-28T00:00:00Z',
        updatedAt: '2026-08-28T00:12:34.123+00:00',
      }),
    );
  });

  function configure(client: unknown): void {
    TestBed.configureTestingModule({
      providers: [
        WorldSettingsService,
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

  function row(patch: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      game_id: '550e8400-e29b-41d4-a716-446655440000',
      preset: 'classic_fantasy',
      title: '',
      universe_type: 'fantasy',
      universe_custom: '',
      magic_level: 'present',
      magic_custom: '',
      technology_level: 'medieval',
      technology_custom: '',
      atmospheres: ['adventurous', 'epic'],
      atmosphere_custom: '',
      narrative_pace: 'balanced',
      timer_mode: 'none',
      timer_seconds: null,
      romance_level: 'possible',
      player_death_level: 'consequential',
      intimate_content_level: 'fade_to_black',
      desired_elements: ['exploration', 'mysteries'],
      desired_elements_custom: '',
      forbidden_elements: ['torture'],
      forbidden_elements_custom: '',
      world_logic: 'coherent',
      free_description: '',
      allow_player2_edit: false,
      locked_at: null,
      created_by: '550e8400-e29b-41d4-a716-446655440001',
      created_at: '2026-08-08T10:00:00.000Z',
      updated_at: '2026-08-08T10:00:00.000Z',
      ...patch,
    };
  }
});
