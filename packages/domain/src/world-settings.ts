import { z } from 'zod';

export const WORLD_PRESETS = [
  'classic_fantasy',
  'dark_fantasy',
  'modern_fantasy',
  'science_fiction',
  'cyberpunk',
  'post_apocalyptic',
  'real_life',
  'historical',
  'mystery_investigation',
  'horror',
  'custom',
] as const;

export const UNIVERSE_TYPES = [
  'fantasy',
  'modern_fantasy',
  'science_fiction',
  'cyberpunk',
  'realistic_contemporary',
  'historical',
  'post_apocalyptic',
  'horror',
  'steampunk',
  'other',
] as const;

export const MAGIC_LEVELS = ['none', 'rare', 'present', 'very_present', 'other'] as const;
export const TECHNOLOGY_LEVELS = [
  'primitive',
  'medieval',
  'industrial',
  'modern',
  'futuristic',
  'very_advanced',
  'other',
] as const;
export const ATMOSPHERES = [
  'epic',
  'adventurous',
  'mysterious',
  'light',
  'dramatic',
  'dark',
  'horrific',
  'romantic',
  'melancholic',
  'humorous',
  'other',
] as const;
export const NARRATIVE_PACES = ['contemplative', 'balanced', 'dynamic'] as const;
export const TIMER_MODES = ['none', 'timed'] as const;
export const ROMANCE_LEVELS = ['none', 'possible', 'important'] as const;
export const PLAYER_DEATH_LEVELS = ['impossible', 'consequential', 'free'] as const;
export const INTIMATE_CONTENT_LEVELS = ['none', 'suggested', 'fade_to_black'] as const;
export const DESIRED_ELEMENTS = [
  'exploration',
  'mysteries',
  'combats',
  'puzzles',
  'politics',
  'relationships',
  'discoveries',
  'survival',
  'large_battles',
  'creatures',
  'magic',
  'other',
] as const;
export const FORBIDDEN_ELEMENTS = [
  'graphic_violence',
  'torture',
  'horror',
  'spiders_insects',
  'illness',
  'grief',
  'animal_violence',
  'kidnapping',
  'betrayal',
  'harassment',
  'other',
] as const;
export const WORLD_LOGICS = ['realistic', 'coherent', 'very_free'] as const;

const optionalText = (max: number) => z.string().trim().max(max);
const supabaseTimestamp = z.string().datetime({ offset: true });

export const WORLD_SETTINGS_LIMITS = {
  atmospheres: 3,
  desiredElements: 4,
  forbiddenElements: 12,
} as const;

export const worldSettingsSchema = z
  .object({
    gameId: z.string().uuid().nullable(),
    preset: z.enum(WORLD_PRESETS),
    title: optionalText(160),
    universeType: z.enum(UNIVERSE_TYPES),
    universeCustom: optionalText(120),
    magicLevel: z.enum(MAGIC_LEVELS),
    magicCustom: optionalText(120),
    technologyLevel: z.enum(TECHNOLOGY_LEVELS),
    technologyCustom: optionalText(120),
    atmospheres: z.array(z.enum(ATMOSPHERES)).min(1).max(WORLD_SETTINGS_LIMITS.atmospheres),
    atmosphereCustom: optionalText(120),
    narrativePace: z.enum(NARRATIVE_PACES),
    timerMode: z.enum(TIMER_MODES),
    timerSeconds: z.number().int().min(120).max(3600).nullable(),
    romanceLevel: z.enum(ROMANCE_LEVELS),
    playerDeathLevel: z.enum(PLAYER_DEATH_LEVELS),
    intimateContentLevel: z.enum(INTIMATE_CONTENT_LEVELS),
    desiredElements: z
      .array(z.enum(DESIRED_ELEMENTS))
      .min(1)
      .max(WORLD_SETTINGS_LIMITS.desiredElements),
    desiredElementsCustom: optionalText(160),
    forbiddenElements: z
      .array(z.enum(FORBIDDEN_ELEMENTS))
      .max(WORLD_SETTINGS_LIMITS.forbiddenElements),
    forbiddenElementsCustom: optionalText(160),
    worldLogic: z.enum(WORLD_LOGICS),
    freeDescription: optionalText(1200),
    allowPlayer2Edit: z.boolean(),
    lockedAt: supabaseTimestamp.nullable(),
    createdBy: z.string().uuid().nullable(),
    createdAt: supabaseTimestamp.nullable(),
    updatedAt: supabaseTimestamp.nullable(),
  })
  .strict()
  .superRefine((settings, context) => {
    if (settings.timerMode === 'none' && settings.timerSeconds !== null) {
      context.addIssue({
        code: 'custom',
        path: ['timerSeconds'],
        message: 'Timer seconds must be null when timer mode is none.',
      });
    }
    if (settings.timerMode === 'timed' && settings.timerSeconds === null) {
      context.addIssue({
        code: 'custom',
        path: ['timerSeconds'],
        message: 'Timer seconds is required when timer mode is timed.',
      });
    }
  });

export type WorldSettings = z.infer<typeof worldSettingsSchema>;
export type WorldPreset = (typeof WORLD_PRESETS)[number];

export const DEFAULT_WORLD_SETTINGS: WorldSettings = {
  gameId: null,
  preset: 'classic_fantasy',
  title: '',
  universeType: 'fantasy',
  universeCustom: '',
  magicLevel: 'present',
  magicCustom: '',
  technologyLevel: 'medieval',
  technologyCustom: '',
  atmospheres: ['adventurous', 'epic'],
  atmosphereCustom: '',
  narrativePace: 'balanced',
  timerMode: 'none',
  timerSeconds: null,
  romanceLevel: 'possible',
  playerDeathLevel: 'consequential',
  intimateContentLevel: 'fade_to_black',
  desiredElements: ['exploration', 'mysteries', 'creatures'],
  desiredElementsCustom: '',
  forbiddenElements: [],
  forbiddenElementsCustom: '',
  worldLogic: 'coherent',
  freeDescription: '',
  allowPlayer2Edit: false,
  lockedAt: null,
  createdBy: null,
  createdAt: null,
  updatedAt: null,
};

export const WORLD_PRESET_VALUES: Record<WorldPreset, Partial<WorldSettings>> = {
  classic_fantasy: {
    universeType: 'fantasy',
    magicLevel: 'present',
    technologyLevel: 'medieval',
    atmospheres: ['adventurous', 'epic'],
    desiredElements: ['exploration', 'mysteries', 'creatures'],
    worldLogic: 'coherent',
  },
  dark_fantasy: {
    universeType: 'fantasy',
    magicLevel: 'rare',
    technologyLevel: 'medieval',
    atmospheres: ['dark', 'dramatic', 'mysterious'],
    desiredElements: ['mysteries', 'combats', 'creatures'],
    playerDeathLevel: 'consequential',
    worldLogic: 'coherent',
  },
  modern_fantasy: {
    universeType: 'modern_fantasy',
    magicLevel: 'rare',
    technologyLevel: 'modern',
    atmospheres: ['mysterious', 'dramatic'],
    desiredElements: ['mysteries', 'relationships', 'discoveries'],
  },
  science_fiction: {
    universeType: 'science_fiction',
    magicLevel: 'none',
    technologyLevel: 'futuristic',
    atmospheres: ['mysterious', 'adventurous'],
    desiredElements: ['exploration', 'discoveries', 'politics'],
  },
  cyberpunk: {
    universeType: 'cyberpunk',
    magicLevel: 'none',
    technologyLevel: 'very_advanced',
    atmospheres: ['dark', 'mysterious', 'dramatic'],
    desiredElements: ['politics', 'mysteries', 'relationships'],
  },
  post_apocalyptic: {
    universeType: 'post_apocalyptic',
    magicLevel: 'none',
    technologyLevel: 'industrial',
    atmospheres: ['dark', 'melancholic', 'dramatic'],
    desiredElements: ['survival', 'exploration', 'discoveries'],
  },
  real_life: {
    universeType: 'realistic_contemporary',
    magicLevel: 'none',
    technologyLevel: 'modern',
    atmospheres: ['dramatic', 'light'],
    desiredElements: ['relationships', 'mysteries'],
    worldLogic: 'realistic',
  },
  historical: {
    universeType: 'historical',
    magicLevel: 'none',
    technologyLevel: 'industrial',
    atmospheres: ['dramatic', 'mysterious'],
    desiredElements: ['politics', 'relationships', 'discoveries'],
    worldLogic: 'realistic',
  },
  mystery_investigation: {
    universeType: 'realistic_contemporary',
    magicLevel: 'none',
    technologyLevel: 'modern',
    atmospheres: ['mysterious', 'dramatic'],
    desiredElements: ['mysteries', 'puzzles', 'discoveries'],
  },
  horror: {
    universeType: 'horror',
    magicLevel: 'rare',
    technologyLevel: 'modern',
    atmospheres: ['horrific', 'dark', 'mysterious'],
    desiredElements: ['survival', 'mysteries', 'discoveries'],
    romanceLevel: 'none',
  },
  custom: {},
};

export function applyWorldPreset(current: WorldSettings, preset: WorldPreset): WorldSettings {
  return worldSettingsSchema.parse({
    ...current,
    ...WORLD_PRESET_VALUES[preset],
    preset,
  });
}

export function createDefaultWorldSettings(patch: Partial<WorldSettings> = {}): WorldSettings {
  return worldSettingsSchema.parse({ ...DEFAULT_WORLD_SETTINGS, ...patch });
}
