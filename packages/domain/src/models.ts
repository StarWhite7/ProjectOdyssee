export type UserProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
};
export type GameStatus =
  'waiting' | 'character_creation' | 'ready' | 'active' | 'paused' | 'completed' | 'abandoned';
export type Game = {
  id: string;
  inviteCode: string;
  ownerId: string;
  title: string;
  status: GameStatus;
  playMode: 'realtime' | 'asynchronous';
  timerSeconds: number | null;
  turnNumber: number;
  currentPhase: 'setup' | 'scene' | 'decision' | 'resolution' | 'completed';
  createdAt: string;
  updatedAt: string;
};
export type Character = {
  id: string;
  gameId: string;
  ownerId: string;
  name: string;
  pronouns: string | null;
  ageDescription: string | null;
  appearance: string;
  personalityTraits: string[];
  values: string[];
  fears: string[];
  strengths: string[];
  weaknesses: string[];
  backstory: string;
  freeformDescription: string;
  currentEmotionalState: string[];
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};
export type WorldDefinition = {
  genre: string;
  customDescription: string;
  tone: string[];
  realismLevel: 'realistic' | 'grounded' | 'flexible' | 'fantastical';
  violenceLevel: 'none' | 'light' | 'moderate';
  romanceEnabled: boolean;
  characterDeathEnabled: boolean;
  customRules: string[];
  forbiddenElements: string[];
};
export type GoalStatus = 'active' | 'completed' | 'failed' | 'abandoned' | 'transformed';
export type CharacterGoal = {
  id: string;
  characterId: string;
  visibility: 'public' | 'private' | 'emerging';
  category:
    | 'personal'
    | 'relational'
    | 'emotional'
    | 'moral'
    | 'material'
    | 'exploration'
    | 'survival'
    | 'other';
  description: string;
  status: GoalStatus;
  progressSummary: string | null;
};
export type ProposedIntention = { id: string; label: string; description: string };
export type StoryTurn = {
  id: string;
  gameId: string;
  turnNumber: number;
  sceneText: string;
  location: string | null;
  sceneTime: string | null;
  proposedIntentions: Record<string, ProposedIntention[]>;
  resolutionText: string | null;
  createdAt: string;
  resolvedAt: string | null;
};
export type PlayerDecision = {
  id: string;
  gameId: string;
  turnId: string;
  playerId: string;
  characterId: string;
  source: 'suggested' | 'freeform' | 'timeout';
  intentionId: string | null;
  actionText: string;
  submittedAt: string;
  revealedAt: string | null;
};
export type MemoryType =
  | 'event'
  | 'relationship'
  | 'promise'
  | 'lie'
  | 'discovery'
  | 'trauma'
  | 'achievement'
  | 'world_change';
export type Memory = {
  id: string;
  gameId: string;
  characterId: string | null;
  type: MemoryType;
  importance: number;
  title: string;
  summary: string;
  involvedEntityIds: string[];
  sourceTurnId: string;
  createdAt: string;
};
export type RelationshipState = {
  id: string;
  gameId: string;
  sourceCharacterId: string;
  targetCharacterId: string;
  label: string;
  trustDescription: string;
  emotionalState: string[];
  unresolvedTensions: string[];
  sharedMemories: string[];
  updatedAt: string;
};
export type WorldChange = {
  entityType: string;
  entityId?: string | undefined;
  description: string;
  permanence: 'temporary' | 'persistent' | 'irreversible';
};
export type TurnResolutionResult = {
  resolutionNarration: string;
  nextScene: { text: string; location: string | null; sceneTime: string | null };
  proposedIntentions: Record<string, ProposedIntention[]>;
  memoryCandidates: Array<{
    type: MemoryType;
    importance: number;
    title: string;
    summary: string;
    involvedCharacterIds: string[];
  }>;
  relationshipChanges: Array<{
    sourceCharacterId: string;
    targetCharacterId: string;
    newTrustDescription?: string | undefined;
    addedEmotions?: string[] | undefined;
    removedEmotions?: string[] | undefined;
    addedTensions?: string[] | undefined;
    resolvedTensions?: string[] | undefined;
  }>;
  worldChanges: WorldChange[];
  goalChanges: Array<{
    goalId: string;
    status?: GoalStatus | undefined;
    progressSummary?: string | undefined;
  }>;
};
