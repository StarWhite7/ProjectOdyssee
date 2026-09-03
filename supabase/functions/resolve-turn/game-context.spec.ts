import { describe, expect, it } from 'vitest';
import {
  buildFoundationalWorldRules,
  buildGameContext,
  buildOpeningGameContext,
} from './game-context';

const worldSettings = {
  preset: 'cyberpunk',
  title: 'Neon Veil',
  universe_type: 'cyberpunk',
  universe_custom: '',
  magic_level: 'none',
  magic_custom: '',
  technology_level: 'very_advanced',
  technology_custom: '',
  atmospheres: ['dark', 'mysterious'],
  atmosphere_custom: '',
  narrative_pace: 'balanced',
  timer_mode: 'none',
  timer_seconds: null,
  romance_level: 'possible',
  player_death_level: 'consequential',
  intimate_content_level: 'fade_to_black',
  desired_elements: ['mysteries', 'politics'],
  desired_elements_custom: '',
  forbidden_elements: ['torture', 'animal_violence'],
  forbidden_elements_custom: '',
  world_logic: 'coherent',
  free_description: 'Une ville verticale sous surveillance.',
  locked_at: '2026-08-08T10:00:00.000Z',
};

describe('game context world settings', () => {
  it('builds a persistent world-rules section with every narrative option', () => {
    const context = buildFoundationalWorldRules(worldSettings);

    for (const key of [
      'universe_type',
      'magic_level',
      'technology_level',
      'atmospheres',
      'narrative_pace',
      'romance_level',
      'player_death_level',
      'intimate_content_level',
      'desired_elements',
      'forbidden_elements',
      'free_description',
      'world_logic',
    ]) {
      expect(context).toContain(key);
    }
    expect(context).toContain('torture');
    expect(context).toContain('animal_violence');
    expect(context).toContain('limites absolues');
  });

  it('attaches foundational world rules to every generated game context', () => {
    const context = buildGameContext({
      game: {},
      world: {},
      worldSettings,
      characters: [],
      goals: [],
      currentTurn: {},
      decisions: [],
      recentTurns: [],
      memories: [],
      summary: null,
    });

    expect(context.foundationalWorldRules).toContain('REGLES FONDATRICES');
    expect(context.foundationalWorldRules).toContain('forbidden_elements: torture');
  });

  it('builds different opening contexts for different configured worlds', () => {
    const cyberpunk = buildOpeningGameContext({
      game: { id: 'game-cyberpunk' },
      world: {},
      worldSettings,
      characters: [{ id: 'character-a', name: 'Nyx' }],
      goals: [],
    });
    const fantasy = buildOpeningGameContext({
      game: { id: 'game-fantasy' },
      world: {},
      worldSettings: {
        ...worldSettings,
        preset: 'classic_fantasy',
        universe_type: 'fantasy',
        magic_level: 'very_present',
        technology_level: 'medieval',
        atmospheres: ['adventurous', 'epic'],
      },
      characters: [{ id: 'character-b', name: 'Elya' }],
      goals: [],
    });

    expect(cyberpunk.foundationalWorldRules).toContain('universe_type: cyberpunk');
    expect(fantasy.foundationalWorldRules).toContain('universe_type: fantasy');
    expect(cyberpunk.foundationalWorldRules).not.toBe(fantasy.foundationalWorldRules);
  });

  it('keeps character data and forbidden limits in the first-turn context', () => {
    const context = buildOpeningGameContext({
      game: { id: 'game-1' },
      world: {},
      worldSettings,
      characters: [
        { id: 'character-a', name: 'Nyx', backstory: 'Ancienne enquêtrice des bas-fonds.' },
        { id: 'character-b', name: 'Oran', backstory: 'Technicien d’une tour orbitale.' },
      ],
      goals: [{ character_id: 'character-a', description: 'Trouver la source du signal.' }],
    });

    expect(JSON.stringify(context.characters)).toContain('Ancienne enquêtrice');
    expect(context.foundationalWorldRules).toContain('forbidden_elements: torture');
    expect(context.foundationalWorldRules).toContain('animal_violence');
  });
});
