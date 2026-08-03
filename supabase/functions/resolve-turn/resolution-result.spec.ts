import { describe, expect, it } from 'vitest';
import { ResolutionValidationError, validateAndNormalizeResult } from './resolution-result';

const characterIds = ['character-1', 'character-2'];
const intention = (suffix: string) => ({
  id: `intention-${suffix}`,
  label: `Choix ${suffix}`,
  description: `Description ${suffix}`,
});
const validResult = () => ({
  resolutionNarration: 'Les deux décisions transforment la situation.',
  nextScene: { text: 'Une nouvelle scène commence.', location: null, sceneTime: 'Aube' },
  proposedIntentions: {
    'character-1': [intention('1a'), intention('1b')],
    'character-2': [intention('2a'), intention('2b')],
  },
  memoryCandidates: [
    {
      type: 'discovery',
      importance: 7,
      title: 'Une découverte',
      summary: 'Un indice persiste.',
      involvedCharacterIds: characterIds,
    },
  ],
  relationshipChanges: [],
  worldChanges: [],
  goalChanges: [],
});

function expectCode(value: unknown, code: string): void {
  try {
    validateAndNormalizeResult(value, characterIds);
    throw new Error('expected validation to fail');
  } catch (error) {
    expect(error).toBeInstanceOf(ResolutionValidationError);
    expect(error).toMatchObject({ code });
  }
}

describe('resolution result validation', () => {
  it('accepts a conforming response and defaults only absent change arrays', () => {
    const input = validResult();
    delete (input as Partial<typeof input>).relationshipChanges;
    delete (input as Partial<typeof input>).worldChanges;
    delete (input as Partial<typeof input>).goalChanges;

    expect(validateAndNormalizeResult(input, characterIds)).toMatchObject({
      resolutionNarration: input.resolutionNarration,
      relationshipChanges: [],
      worldChanges: [],
      goalChanges: [],
    });
  });

  it('rejects an absent resolution narration', () => {
    const input = validResult() as Partial<ReturnType<typeof validResult>>;
    delete input.resolutionNarration;
    expectCode(input, 'invalid_resolution');
  });

  it('rejects an absent next scene text', () => {
    const input = validResult();
    delete (input.nextScene as Partial<typeof input.nextScene>).text;
    expectCode(input, 'invalid_next_scene');
  });

  it('rejects a missing character intentions key', () => {
    const input = validResult();
    delete (input.proposedIntentions as Record<string, unknown>)['character-2'];
    expectCode(input, 'invalid_intentions');
  });

  it.each([1, 3])('rejects %i intention(s) for a character', (count) => {
    const input = validResult();
    input.proposedIntentions['character-1'] = Array.from({ length: count }, (_, index) =>
      intention(`changed-${index}`),
    );
    expectCode(input, 'invalid_intentions');
  });

  it.each(['label', 'description'] as const)('rejects an intention without %s', (field) => {
    const input = validResult();
    input.proposedIntentions['character-1'][0]![field] = '';
    expectCode(input, 'invalid_intentions');
  });

  it.each([undefined, '7', 0, 11, 1.5])('rejects invalid memory importance %s', (importance) => {
    const input = validResult();
    (input.memoryCandidates[0] as { importance: unknown }).importance = importance;
    expectCode(input, 'invalid_memory_candidates');
  });
});
