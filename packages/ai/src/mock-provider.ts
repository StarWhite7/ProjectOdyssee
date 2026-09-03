import type { TurnResolutionResult } from '@odyssee/domain';
import type {
  GoalGenerationInput,
  GoalGenerationResult,
  InitialWorldInput,
  InitialWorldResult,
  MemorySummaryInput,
  MemorySummaryResult,
  NarrativeAiProvider,
  TurnResolutionInput,
} from './provider.js';

function hash(value: string): number {
  let h = 2166136261;
  for (const char of value) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return h >>> 0;
}
function intentions(characterId: string, turn: number) {
  return [
    {
      id: `${characterId}-${turn}-observe`,
      label: 'Lire la scène',
      description: 'Prendre le temps de comprendre les signes du moment.',
    },
    {
      id: `${characterId}-${turn}-act`,
      label: 'Faire un pas',
      description: 'Agir selon ses valeurs, sans décider pour l’autre.',
    },
  ];
}
export class MockNarrativeAiProvider implements NarrativeAiProvider {
  async generateInitialWorld(input: InitialWorldInput): Promise<InitialWorldResult> {
    const variant = hash(input.seed) % 3;
    const place =
      ['les passerelles de Nacre', 'la gare des Orages', 'le jardin suspendu'][variant] ??
      'la cité';
    return {
      title: `Les Échos de ${input.world.genre}`,
      context: `Dans un univers ${input.world.genre.toLocaleLowerCase()}, chaque choix laisse une trace.`,
      firstScene: `La lumière décline sur ${place}. Un message lié à une disparition vient d’être découvert, mais son origine reste incertaine.`,
      location: place,
      intentions: Object.fromEntries(input.characters.map((c) => [c.id, intentions(c.id, 1)])),
    };
  }
  async generateCharacterGoals(input: GoalGenerationInput): Promise<GoalGenerationResult> {
    return {
      goals: input.characters.flatMap((c, index) => [
        {
          characterId: c.id,
          visibility: 'private' as const,
          category: index % 2 ? ('relational' as const) : ('exploration' as const),
          description:
            index % 2
              ? 'Comprendre ce que votre partenaire ne parvient pas encore à dire.'
              : 'Découvrir la vérité sans sacrifier vos valeurs.',
          status: 'active' as const,
          progressSummary: null,
        },
      ]),
    };
  }
  async resolveTurn(input: TurnResolutionInput): Promise<TurnResolutionResult> {
    const [a, b] = input.decisions;
    const turn = input.currentTurn.turnNumber;
    const actionA = a?.actionText ?? 'observe';
    const actionB = b?.actionText ?? 'hésite';
    return {
      resolutionNarration: `Les deux initiatives se rencontrent : tandis que l’un tente de ${actionA.toLocaleLowerCase()}, l’autre choisit de ${actionB.toLocaleLowerCase()}. Leur combinaison révèle une piste nouvelle sans refermer leurs possibilités.`,
      nextScene: {
        text: `La conséquence de leurs choix transforme la situation. Un détail jusque-là invisible apparaît, et chacun peut décider de la suite.`,
        location: input.currentTurn.location,
        sceneTime: `Tour ${turn + 1}`,
      },
      proposedIntentions: Object.fromEntries(
        input.characters.map((c) => [c.id, intentions(c.id, turn + 1)]),
      ),
      memoryCandidates: [
        {
          type: 'discovery',
          importance: 6 + (hash(`${input.seed}-${turn}`) % 3),
          title: `La piste du tour ${turn}`,
          summary:
            'Les actions combinées ont révélé une piste que ni l’un ni l’autre n’aurait trouvée seul.',
          involvedCharacterIds: input.characters.map((c) => c.id),
        },
      ],
      relationshipChanges:
        input.characters.length === 2
          ? [
              {
                sourceCharacterId: input.characters[0]!.id,
                targetCharacterId: input.characters[1]!.id,
                newTrustDescription: 'Une confiance prudente née d’une initiative partagée.',
                addedEmotions: ['curiosité'],
              },
            ]
          : [],
      worldChanges: [],
      goalChanges: [],
    };
  }
  async summarizeMemory(input: MemorySummaryInput): Promise<MemorySummaryResult> {
    return {
      summary: [
        input.existingSummary,
        ...input.turns.map((t) => `Tour ${t.turnNumber}: ${t.resolutionText ?? t.sceneText}`),
      ]
        .filter(Boolean)
        .join('\n')
        .slice(-6000),
      immutableFacts: [],
    };
  }
}
