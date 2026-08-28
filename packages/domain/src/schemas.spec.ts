import { describe, expect, it } from 'vitest';
import { playerDecisionInputSchema } from './schemas.js';
import {
  applyWorldPreset,
  createDefaultWorldSettings,
  worldSettingsSchema,
} from './world-settings.js';

describe('playerDecisionInputSchema', () => {
  it('rejects an oversized free action', () => {
    expect(() =>
      playerDecisionInputSchema.parse({
        turnId: crypto.randomUUID(),
        characterId: crypto.randomUUID(),
        source: 'freeform',
        intentionId: null,
        actionText: 'x'.repeat(1501),
      }),
    ).toThrow();
  });
});

describe('worldSettingsSchema', () => {
  it('validates structured world options without requiring free text', () => {
    const settings = createDefaultWorldSettings({
      gameId: crypto.randomUUID(),
      createdBy: crypto.randomUUID(),
    });

    expect(worldSettingsSchema.parse(settings)).toEqual(settings);
    expect(settings.freeDescription).toBe('');
    expect(settings.forbiddenElements).toEqual([]);
  });

  it('applies presets as editable structured defaults', () => {
    const current = createDefaultWorldSettings();
    const cyberpunk = applyWorldPreset(current, 'cyberpunk');

    expect(cyberpunk).toEqual(
      expect.objectContaining({
        preset: 'cyberpunk',
        universeType: 'cyberpunk',
        magicLevel: 'none',
        technologyLevel: 'very_advanced',
        worldLogic: 'coherent',
      }),
    );
    expect(cyberpunk.atmospheres).toEqual(['dark', 'mysterious', 'dramatic']);
  });

  it('enforces timer consistency and selection limits', () => {
    expect(() =>
      worldSettingsSchema.parse(
        createDefaultWorldSettings({
          timerMode: 'none',
          timerSeconds: 300,
        }),
      ),
    ).toThrow();
    expect(() =>
      worldSettingsSchema.parse(
        createDefaultWorldSettings({
          atmospheres: ['epic', 'adventurous', 'dark', 'light'],
        }),
      ),
    ).toThrow();
  });

  it('accepts Supabase timestamptz strings with Z or offset and rejects invalid timestamps', () => {
    expect(
      worldSettingsSchema.parse(
        createDefaultWorldSettings({
          lockedAt: '2026-08-28T00:12:34.123Z',
          createdAt: '2026-08-28T00:12:34.123+00:00',
          updatedAt: '2026-08-28T02:12:34+02:00',
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        lockedAt: '2026-08-28T00:12:34.123Z',
        createdAt: '2026-08-28T00:12:34.123+00:00',
        updatedAt: '2026-08-28T02:12:34+02:00',
      }),
    );

    expect(() =>
      worldSettingsSchema.parse(
        createDefaultWorldSettings({
          createdAt: 'not-a-date',
        }),
      ),
    ).toThrow();
  });
});
