import { turnResolutionResultSchema } from '@odyssee/domain';
import type {
  GoalGenerationResult,
  InitialWorldResult,
  MemorySummaryResult,
  NarrativeAiProvider,
  TurnResolutionInput,
} from './provider.js';

export type GeminiTransport = (request: {
  model: string;
  system: string;
  data: unknown;
}) => Promise<unknown>;
export class GeminiNarrativeAiProvider implements NarrativeAiProvider {
  constructor(
    private readonly model: string,
    private readonly transport: GeminiTransport,
  ) {}
  generateInitialWorld(): Promise<InitialWorldResult> {
    return Promise.reject(new Error('Le transport Gemini world doit être configuré côté serveur.'));
  }
  generateCharacterGoals(): Promise<GoalGenerationResult> {
    return Promise.reject(new Error('Le transport Gemini goals doit être configuré côté serveur.'));
  }
  async resolveTurn(input: TurnResolutionInput) {
    const raw = await this.transport({
      model: this.model,
      system: 'turn-resolution-v1',
      data: input,
    });
    return turnResolutionResultSchema.parse(raw);
  }
  summarizeMemory(): Promise<MemorySummaryResult> {
    return Promise.reject(
      new Error('Le transport Gemini summary doit être configuré côté serveur.'),
    );
  }
}
