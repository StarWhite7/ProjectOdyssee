export type ResolutionValidationCode =
  | 'invalid_ai_response'
  | 'invalid_resolution'
  | 'invalid_next_scene'
  | 'invalid_intentions'
  | 'invalid_memory_candidates'
  | 'invalid_changes';

export class ResolutionValidationError extends Error {
  constructor(readonly code: ResolutionValidationCode) {
    super(code);
    this.name = 'ResolutionValidationError';
  }
}

export type ResolutionResult = {
  resolutionNarration: string;
  nextScene: { text: string; location: string | null; sceneTime: string | null };
  proposedIntentions: Record<string, Array<{ id: string; label: string; description: string }>>;
  memoryCandidates: Array<{
    type: string;
    importance: number;
    title: string;
    summary: string;
    involvedCharacterIds: string[];
  }>;
  relationshipChanges: unknown[];
  worldChanges: unknown[];
  goalChanges: unknown[];
};

export function validateAndNormalizeResult(
  value: unknown,
  characterIds: string[],
): ResolutionResult {
  if (!isRecord(value)) throw new ResolutionValidationError('invalid_ai_response');
  if (!isNonEmptyString(value['resolutionNarration'], 12_000))
    throw new ResolutionValidationError('invalid_resolution');

  const nextScene = value['nextScene'];
  if (
    !isRecord(nextScene) ||
    !isNonEmptyString(nextScene['text'], 12_000) ||
    !isNullableString(nextScene['location']) ||
    !isNullableString(nextScene['sceneTime'])
  )
    throw new ResolutionValidationError('invalid_next_scene');

  const proposedIntentions = value['proposedIntentions'];
  if (!isRecord(proposedIntentions)) throw new ResolutionValidationError('invalid_intentions');
  for (const characterId of characterIds) {
    const intentions = proposedIntentions[characterId];
    if (
      !Array.isArray(intentions) ||
      intentions.length !== 2 ||
      intentions.some(
        (intention) =>
          !isRecord(intention) ||
          !isNonEmptyString(intention['id']) ||
          !isNonEmptyString(intention['label']) ||
          !isNonEmptyString(intention['description']),
      )
    )
      throw new ResolutionValidationError('invalid_intentions');
  }

  const memoryCandidates = value['memoryCandidates'];
  if (
    !Array.isArray(memoryCandidates) ||
    memoryCandidates.some(
      (memory) =>
        !isRecord(memory) ||
        !isNonEmptyString(memory['type']) ||
        !Number.isInteger(memory['importance']) ||
        (memory['importance'] as number) < 1 ||
        (memory['importance'] as number) > 10 ||
        !isNonEmptyString(memory['title']) ||
        !isNonEmptyString(memory['summary']) ||
        !Array.isArray(memory['involvedCharacterIds']) ||
        memory['involvedCharacterIds'].some((id) => typeof id !== 'string'),
    )
  )
    throw new ResolutionValidationError('invalid_memory_candidates');

  const relationshipChanges = optionalArray(value, 'relationshipChanges');
  const worldChanges = optionalArray(value, 'worldChanges');
  const goalChanges = optionalArray(value, 'goalChanges');

  return {
    resolutionNarration: value['resolutionNarration'],
    nextScene: {
      text: nextScene['text'],
      location: nextScene['location'],
      sceneTime: nextScene['sceneTime'],
    },
    proposedIntentions: proposedIntentions as ResolutionResult['proposedIntentions'],
    memoryCandidates: memoryCandidates as ResolutionResult['memoryCandidates'],
    relationshipChanges,
    worldChanges,
    goalChanges,
  };
}

function optionalArray(value: Record<string, unknown>, key: string): unknown[] {
  const candidate = value[key];
  if (candidate === undefined) return [];
  if (!Array.isArray(candidate)) throw new ResolutionValidationError('invalid_changes');
  return candidate;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(
  value: unknown,
  maximumLength = Number.POSITIVE_INFINITY,
): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maximumLength;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}
