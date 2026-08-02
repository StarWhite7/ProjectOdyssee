import { describe, expect, it } from 'vitest';
import { MockNarrativeAiProvider } from './mock-provider.js';
describe('MockNarrativeAiProvider', () => {
  it('is deterministic for a seed', async () => {
    const provider = new MockNarrativeAiProvider();
    const input = {
      seed: 'same',
      world: {
        genre: 'Mystère',
        customDescription: '',
        tone: ['émotion'],
        realismLevel: 'flexible' as const,
        violenceLevel: 'light' as const,
        romanceEnabled: false,
        characterDeathEnabled: false,
        customRules: [],
        forbiddenElements: [],
      },
      characters: [],
    };
    expect(await provider.generateInitialWorld(input)).toEqual(
      await provider.generateInitialWorld(input),
    );
  });
});
