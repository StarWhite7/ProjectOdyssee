type WorldSettingsRow = {
  preset?: string | null;
  title?: string | null;
  universe_type?: string | null;
  universe_custom?: string | null;
  magic_level?: string | null;
  magic_custom?: string | null;
  technology_level?: string | null;
  technology_custom?: string | null;
  atmospheres?: string[] | null;
  atmosphere_custom?: string | null;
  narrative_pace?: string | null;
  timer_mode?: string | null;
  timer_seconds?: number | null;
  romance_level?: string | null;
  player_death_level?: string | null;
  intimate_content_level?: string | null;
  desired_elements?: string[] | null;
  desired_elements_custom?: string | null;
  forbidden_elements?: string[] | null;
  forbidden_elements_custom?: string | null;
  world_logic?: string | null;
  free_description?: string | null;
  locked_at?: string | null;
};

type RawGameContext = {
  game: unknown;
  world: unknown;
  worldSettings: WorldSettingsRow | null;
  characters: unknown[];
  goals: unknown[];
  currentTurn: unknown;
  decisions: unknown[];
  recentTurns: unknown[];
  memories: unknown[];
  summary: unknown;
};

export function buildGameContext(context: RawGameContext) {
  return {
    ...context,
    foundationalWorldRules: buildFoundationalWorldRules(context.worldSettings),
  };
}

export function buildFoundationalWorldRules(settings: WorldSettingsRow | null): string {
  if (!settings) {
    return 'world_settings: unavailable';
  }

  return [
    '=== REGLES FONDATRICES DU MONDE ===',
    `preset: ${settings.preset ?? 'classic_fantasy'}`,
    `title: ${settings.title ?? ''}`,
    `universe_type: ${settings.universe_type ?? 'fantasy'}`,
    `universe_custom: ${settings.universe_custom ?? ''}`,
    `magic_level: ${settings.magic_level ?? 'present'}`,
    `magic_custom: ${settings.magic_custom ?? ''}`,
    `technology_level: ${settings.technology_level ?? 'medieval'}`,
    `technology_custom: ${settings.technology_custom ?? ''}`,
    `atmospheres: ${join(settings.atmospheres)}`,
    `atmosphere_custom: ${settings.atmosphere_custom ?? ''}`,
    `narrative_pace: ${settings.narrative_pace ?? 'balanced'}`,
    `timer_mode: ${settings.timer_mode ?? 'none'}`,
    `timer_seconds: ${settings.timer_seconds ?? ''}`,
    `romance_level: ${settings.romance_level ?? 'possible'}`,
    `player_death_level: ${settings.player_death_level ?? 'consequential'}`,
    `intimate_content_level: ${settings.intimate_content_level ?? 'fade_to_black'}`,
    `desired_elements: ${join(settings.desired_elements)}`,
    `desired_elements_custom: ${settings.desired_elements_custom ?? ''}`,
    `forbidden_elements: ${join(settings.forbidden_elements)}`,
    `forbidden_elements_custom: ${settings.forbidden_elements_custom ?? ''}`,
    `world_logic: ${settings.world_logic ?? 'coherent'}`,
    `free_description: ${settings.free_description ?? ''}`,
    `locked_at: ${settings.locked_at ?? ''}`,
    'Les forbidden_elements sont des limites absolues et prioritaires sur les preferences.',
  ].join('\n');
}

function join(values: string[] | null | undefined): string {
  return values?.length ? values.join(', ') : '';
}
