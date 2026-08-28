import { inject, Injectable } from '@angular/core';
import {
  DEFAULT_WORLD_SETTINGS,
  createDefaultWorldSettings,
  worldSettingsSchema,
  type WorldSettings,
} from '@odyssee/domain';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from './auth.service';

type WorldSettingsRow = {
  game_id?: unknown;
  preset?: unknown;
  title?: unknown;
  universe_type?: unknown;
  universe_custom?: unknown;
  magic_level?: unknown;
  magic_custom?: unknown;
  technology_level?: unknown;
  technology_custom?: unknown;
  atmospheres?: unknown;
  atmosphere_custom?: unknown;
  narrative_pace?: unknown;
  timer_mode?: unknown;
  timer_seconds?: unknown;
  romance_level?: unknown;
  player_death_level?: unknown;
  intimate_content_level?: unknown;
  desired_elements?: unknown;
  desired_elements_custom?: unknown;
  forbidden_elements?: unknown;
  forbidden_elements_custom?: unknown;
  world_logic?: unknown;
  free_description?: unknown;
  allow_player2_edit?: unknown;
  locked_at?: unknown;
  created_by?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

@Injectable({ providedIn: 'root' })
export class WorldSettingsService {
  private readonly auth = inject(AuthService);

  async load(gameId: string): Promise<WorldSettings> {
    const client = this.auth.supabase;
    if (!client) return createDefaultWorldSettings({ gameId });

    const { data, error } = await client.rpc('get_game_world_settings', {
      target_game_id: gameId,
    });
    if (error) throw error;
    return this.mapRow(data as WorldSettingsRow);
  }

  async save(gameId: string, settings: WorldSettings): Promise<WorldSettings> {
    const client = this.auth.supabase;
    const normalized = worldSettingsSchema.parse({ ...settings, gameId });
    if (!client) return normalized;

    const { data, error } = await client.rpc('save_game_world_settings', {
      target_game_id: gameId,
      selected_preset: normalized.preset,
      selected_title: normalized.title,
      selected_universe_type: normalized.universeType,
      selected_universe_custom: normalized.universeCustom,
      selected_magic_level: normalized.magicLevel,
      selected_magic_custom: normalized.magicCustom,
      selected_technology_level: normalized.technologyLevel,
      selected_technology_custom: normalized.technologyCustom,
      selected_atmospheres: normalized.atmospheres,
      selected_atmosphere_custom: normalized.atmosphereCustom,
      selected_narrative_pace: normalized.narrativePace,
      selected_timer_mode: normalized.timerMode,
      selected_timer_seconds: normalized.timerSeconds,
      selected_romance_level: normalized.romanceLevel,
      selected_player_death_level: normalized.playerDeathLevel,
      selected_intimate_content_level: normalized.intimateContentLevel,
      selected_desired_elements: normalized.desiredElements,
      selected_desired_elements_custom: normalized.desiredElementsCustom,
      selected_forbidden_elements: normalized.forbiddenElements,
      selected_forbidden_elements_custom: normalized.forbiddenElementsCustom,
      selected_world_logic: normalized.worldLogic,
      selected_free_description: normalized.freeDescription,
      selected_allow_player2_edit: normalized.allowPlayer2Edit,
    });
    if (error) throw error;
    return this.mapRow(data as WorldSettingsRow);
  }

  subscribe(gameId: string, onChange: (settings: WorldSettings) => void): (() => void) | null {
    const client = this.auth.supabase;
    if (!client) return null;
    const channel: RealtimeChannel = client
      .channel(`world-settings:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_world_settings',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') return;
          onChange(this.mapRow(payload.new as WorldSettingsRow));
        },
      )
      .subscribe();
    return () => void client.removeChannel(channel);
  }

  private mapRow(row: WorldSettingsRow): WorldSettings {
    return worldSettingsSchema.parse({
      gameId: this.stringValue(row.game_id),
      preset: this.stringValue(row.preset) ?? 'classic_fantasy',
      title: this.stringValue(row.title) ?? '',
      universeType: this.stringValue(row.universe_type) ?? 'fantasy',
      universeCustom: this.stringValue(row.universe_custom) ?? '',
      magicLevel: this.stringValue(row.magic_level) ?? 'present',
      magicCustom: this.stringValue(row.magic_custom) ?? '',
      technologyLevel: this.stringValue(row.technology_level) ?? 'medieval',
      technologyCustom: this.stringValue(row.technology_custom) ?? '',
      atmospheres: this.stringArray(row.atmospheres, DEFAULT_WORLD_SETTINGS.atmospheres),
      atmosphereCustom: this.stringValue(row.atmosphere_custom) ?? '',
      narrativePace: this.stringValue(row.narrative_pace) ?? 'balanced',
      timerMode: this.stringValue(row.timer_mode) ?? 'none',
      timerSeconds: this.numberValue(row.timer_seconds),
      romanceLevel: this.stringValue(row.romance_level) ?? 'possible',
      playerDeathLevel: this.stringValue(row.player_death_level) ?? 'consequential',
      intimateContentLevel: this.stringValue(row.intimate_content_level) ?? 'fade_to_black',
      desiredElements: this.stringArray(
        row.desired_elements,
        DEFAULT_WORLD_SETTINGS.desiredElements,
      ),
      desiredElementsCustom: this.stringValue(row.desired_elements_custom) ?? '',
      forbiddenElements: this.stringArray(
        row.forbidden_elements,
        DEFAULT_WORLD_SETTINGS.forbiddenElements,
      ),
      forbiddenElementsCustom: this.stringValue(row.forbidden_elements_custom) ?? '',
      worldLogic: this.stringValue(row.world_logic) ?? 'coherent',
      freeDescription: this.stringValue(row.free_description) ?? '',
      allowPlayer2Edit: row.allow_player2_edit === true,
      lockedAt: this.stringValue(row.locked_at),
      createdBy: this.stringValue(row.created_by),
      createdAt: this.stringValue(row.created_at),
      updatedAt: this.stringValue(row.updated_at),
    });
  }

  private stringValue(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private numberValue(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private stringArray(value: unknown, fallback: string[]): string[] {
    const values = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
    return values.length ? values : fallback;
  }
}
