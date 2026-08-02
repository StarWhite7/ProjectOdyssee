import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);
export const worldDefinitionSchema = z
  .object({
    genre: text(80),
    customDescription: z.string().trim().max(3000),
    tone: z.array(text(40)).max(8),
    realismLevel: z.enum(['realistic', 'grounded', 'flexible', 'fantastical']),
    violenceLevel: z.enum(['none', 'light', 'moderate']),
    romanceEnabled: z.boolean(),
    characterDeathEnabled: z.boolean(),
    customRules: z.array(text(240)).max(20),
    forbiddenElements: z.array(text(120)).max(30),
  })
  .strict();
export const characterInputSchema = z
  .object({
    name: text(80),
    pronouns: z.string().trim().max(80).nullable(),
    ageDescription: z.string().trim().max(120).nullable(),
    appearance: text(1200),
    personalityTraits: z.array(text(80)).min(1).max(12),
    values: z.array(text(80)).max(12),
    fears: z.array(text(120)).max(12),
    strengths: z.array(text(120)).max(12),
    weaknesses: z.array(text(120)).max(12),
    backstory: z.string().trim().max(4000),
    freeformDescription: z.string().trim().max(4000),
  })
  .strict();
export const playerDecisionInputSchema = z
  .object({
    turnId: z.string().uuid(),
    characterId: z.string().uuid(),
    source: z.enum(['suggested', 'freeform', 'timeout']),
    intentionId: z.string().max(120).nullable(),
    actionText: text(1500),
  })
  .strict();
const intentionSchema = z
  .object({ id: text(120), label: text(120), description: text(600) })
  .strict();
export const turnResolutionResultSchema = z
  .object({
    resolutionNarration: text(12000),
    nextScene: z
      .object({
        text: text(12000),
        location: z.string().max(240).nullable(),
        sceneTime: z.string().max(240).nullable(),
      })
      .strict(),
    proposedIntentions: z.record(z.string(), z.array(intentionSchema).length(2)),
    memoryCandidates: z
      .array(
        z
          .object({
            type: z.enum([
              'event',
              'relationship',
              'promise',
              'lie',
              'discovery',
              'trauma',
              'achievement',
              'world_change',
            ]),
            importance: z.number().int().min(1).max(10),
            title: text(160),
            summary: text(1200),
            involvedCharacterIds: z.array(z.string().uuid()),
          })
          .strict(),
      )
      .max(12),
    relationshipChanges: z
      .array(
        z
          .object({
            sourceCharacterId: z.string().uuid(),
            targetCharacterId: z.string().uuid(),
            newTrustDescription: z.string().max(600).optional(),
            addedEmotions: z.array(text(80)).optional(),
            removedEmotions: z.array(text(80)).optional(),
            addedTensions: z.array(text(240)).optional(),
            resolvedTensions: z.array(text(240)).optional(),
          })
          .strict(),
      )
      .max(8),
    worldChanges: z
      .array(
        z
          .object({
            entityType: text(80),
            entityId: z.string().max(160).optional(),
            description: text(1000),
            permanence: z.enum(['temporary', 'persistent', 'irreversible']),
          })
          .strict(),
      )
      .max(12),
    goalChanges: z
      .array(
        z
          .object({
            goalId: z.string().uuid(),
            status: z
              .enum(['active', 'completed', 'failed', 'abandoned', 'transformed'])
              .optional(),
            progressSummary: z.string().max(1000).optional(),
          })
          .strict(),
      )
      .max(12),
  })
  .strict();
