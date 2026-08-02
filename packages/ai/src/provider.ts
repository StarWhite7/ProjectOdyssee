import type {
  Character,
  CharacterGoal,
  PlayerDecision,
  ProposedIntention,
  StoryTurn,
  TurnResolutionResult,
  WorldDefinition,
} from '@odyssee/domain';
export type InitialWorldInput = { seed: string; world: WorldDefinition; characters: Character[] };
export type InitialWorldResult = {
  title: string;
  context: string;
  firstScene: string;
  location: string | null;
  intentions: Record<string, ProposedIntention[]>;
};
export type GoalGenerationInput = InitialWorldInput;
export type GoalGenerationResult = { goals: Array<Omit<CharacterGoal, 'id'>> };
export type TurnResolutionInput = {
  seed: string;
  world: WorldDefinition;
  characters: Character[];
  currentTurn: StoryTurn;
  decisions: PlayerDecision[];
  recentTurns: StoryTurn[];
  immutableFacts: string[];
  relevantGoals: CharacterGoal[];
};
export type MemorySummaryInput = { turns: StoryTurn[]; existingSummary: string | null };
export type MemorySummaryResult = { summary: string; immutableFacts: string[] };
export interface NarrativeAiProvider {
  generateInitialWorld(input: InitialWorldInput): Promise<InitialWorldResult>;
  generateCharacterGoals(input: GoalGenerationInput): Promise<GoalGenerationResult>;
  resolveTurn(input: TurnResolutionInput): Promise<TurnResolutionResult>;
  summarizeMemory(input: MemorySummaryInput): Promise<MemorySummaryResult>;
}
