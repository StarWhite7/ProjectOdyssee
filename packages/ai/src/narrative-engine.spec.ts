import { describe, expect, it } from 'vitest';
import type { PlayerDecision, TurnResolutionResult } from '@odyssee/domain';
import { NarrativeEngine } from './narrative-engine.js';
import type { NarrativeAiProvider, TurnResolutionInput } from './provider.js';
import type { TurnRepository } from './narrative-engine.js';

const validResult: TurnResolutionResult = {
  resolutionNarration: 'Les actions produisent une conséquence cohérente.',
  nextScene: { text: 'Une nouvelle situation ouverte apparaît.', location: null, sceneTime: null },
  proposedIntentions: {},
  memoryCandidates: [],
  relationshipChanges: [],
  worldChanges: [],
  goalChanges: [],
};
class Repository implements TurnRepository {
  claims = 0;
  completions = 0;
  failures = 0;
  private claimed = false;
  async insertDecision(): Promise<PlayerDecision> {
    throw new Error('unused');
  }
  async claimResolution() {
    if (this.claimed) return false;
    this.claimed = true;
    this.claims++;
    return true;
  }
  async completeResolution() {
    this.completions++;
  }
  async failResolution() {
    this.failures++;
  }
}
const input = { currentTurn: { id: crypto.randomUUID() } } as TurnResolutionInput;

describe('NarrativeEngine concurrency', () => {
  it('persists only one result for simultaneous requests', async () => {
    const repository = new Repository();
    const provider = { resolveTurn: async () => validResult } as unknown as NarrativeAiProvider;
    const engine = new NarrativeEngine(provider, repository);
    const results = await Promise.all([
      engine.resolveReadyTurn(input),
      engine.resolveReadyTurn(input),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(repository.completions).toBe(1);
    expect(repository.claims).toBe(1);
  });
  it('keeps a failed turn recoverable when AI output is invalid', async () => {
    const repository = new Repository();
    const provider = {
      resolveTurn: async () => ({ resolutionNarration: '' }),
    } as unknown as NarrativeAiProvider;
    const engine = new NarrativeEngine(provider, repository);
    await expect(engine.resolveReadyTurn(input)).rejects.toThrow();
    expect(repository.completions).toBe(0);
    expect(repository.failures).toBe(1);
  });
});
