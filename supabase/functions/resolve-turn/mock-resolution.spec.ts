import { describe, expect, it } from 'vitest';
import { buildMockResolutionNarration } from './mock-resolution';

const action = 'lire les signes discrets de la scène';

function occurrences(text: string, value: string): number {
  return text.toLocaleLowerCase('fr').split(value.toLocaleLowerCase('fr')).length - 1;
}

describe('buildMockResolutionNarration', () => {
  it('uses a collective phrase for strictly identical actions', () => {
    const result = buildMockResolutionNarration([action, action]);
    expect(result).toContain(`tous deux de ${action}`);
    expect(occurrences(result, action)).toBe(1);
  });

  it('ignores case when comparing actions', () => {
    const result = buildMockResolutionNarration([action.toLocaleUpperCase('fr'), action]);
    expect(result).toContain('tous deux');
    expect(occurrences(result, action)).toBe(1);
  });

  it('ignores trailing punctuation and extra whitespace', () => {
    const result = buildMockResolutionNarration([`  ${action}.  `, `${action} !`]);
    expect(result).toContain('tous deux');
    expect(occurrences(result, action)).toBe(1);
  });

  it('keeps both genuinely different actions', () => {
    const otherAction = 'interroger le témoin';
    const result = buildMockResolutionNarration([action, otherAction]);
    expect(result).toContain(action);
    expect(result).toContain(otherAction);
    expect(result).not.toContain('tous deux');
  });

  it('does not produce a duplicated de', () => {
    const result = buildMockResolutionNarration(['de lire le message', 'de lire le message.']);
    expect(result).toContain('tous deux de lire le message');
    expect(result).not.toContain('de de lire');
  });
});
