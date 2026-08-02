import { playerDecisionInputSchema, turnResolutionResultSchema } from '@odyssee/domain';
import type { PlayerDecision, TurnResolutionResult } from '@odyssee/domain';
import type { NarrativeAiProvider, TurnResolutionInput } from './provider.js';
export interface TurnRepository {
  insertDecision(
    decision: Omit<PlayerDecision, 'id' | 'submittedAt' | 'revealedAt'>,
  ): Promise<PlayerDecision>;
  claimResolution(turnId: string): Promise<boolean>;
  completeResolution(turnId: string, result: TurnResolutionResult): Promise<void>;
  failResolution(turnId: string, message: string): Promise<void>;
}
export class NarrativeEngine {
  constructor(
    private readonly provider: NarrativeAiProvider,
    private readonly repository: TurnRepository,
  ) {}
  submitDecision(input: Omit<PlayerDecision, 'id' | 'submittedAt' | 'revealedAt'>) {
    playerDecisionInputSchema.parse({
      turnId: input.turnId,
      characterId: input.characterId,
      source: input.source,
      intentionId: input.intentionId,
      actionText: input.actionText,
    });
    return this.repository.insertDecision(input);
  }
  async resolveReadyTurn(input: TurnResolutionInput): Promise<TurnResolutionResult | null> {
    if (!(await this.repository.claimResolution(input.currentTurn.id))) return null;
    try {
      const result = turnResolutionResultSchema.parse(await this.provider.resolveTurn(input));
      await this.repository.completeResolution(input.currentTurn.id, result);
      return result;
    } catch (error) {
      await this.repository.failResolution(
        input.currentTurn.id,
        error instanceof Error ? error.message : 'Erreur IA inconnue',
      );
      throw error;
    }
  }
}
