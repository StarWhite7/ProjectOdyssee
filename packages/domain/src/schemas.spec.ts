import { describe, expect, it } from 'vitest';
import { playerDecisionInputSchema } from './schemas.js';

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
