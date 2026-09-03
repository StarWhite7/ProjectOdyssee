import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'supabase/functions/start-game/index.ts'),
  'utf8',
);

describe('start-game runtime source', () => {
  it('does not contain the old fixed first-turn fallback strings', () => {
    expect(source).not.toContain('Le seuil de l’aventure');
    expect(source).not.toContain("Le seuil de l'aventure");
    expect(source).not.toContain('Le monde retient son souffle');
    expect(source).not.toContain('Observer les détails');
    expect(source).not.toContain('Prendre l’initiative');
  });

  it('generates the first turn only when it does not already exist', () => {
    expect(source).toContain(".eq('turn_number', 1)");
    expect(source).toContain('if (!existing)');
    expect(source).toContain('generateOpeningTurn');
    expect(source.indexOf('if (!existing)')).toBeLessThan(
      source.lastIndexOf('generateOpeningTurn'),
    );
  });

  it('treats the unique first-turn conflict as idempotent instead of creating another turn', () => {
    expect(source).toContain("turnError.code !== '23505'");
    expect(source).toContain('game_world_settings');
    expect(source).toContain('locked_at');
  });
});
