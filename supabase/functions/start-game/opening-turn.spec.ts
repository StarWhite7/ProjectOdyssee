import { describe, expect, it, vi } from 'vitest';
import type { AiConfiguration } from '../resolve-turn/ai-provider';
import { GeminiResponseError } from '../resolve-turn/gemini-client';
import {
  buildMockOpeningTurn,
  callGeminiOpeningTurn,
  generateOpeningTurn,
  OpeningTurnValidationError,
  validateAndNormalizeOpeningTurn,
  type OpeningTurnContext,
} from './opening-turn';

const payload = (text: string) => ({ candidates: [{ content: { parts: [{ text }] } }] });
const characterIds = ['character-cyber', 'character-fantasy'];

describe('opening turn generation', () => {
  it('sends world settings and characters to Gemini for the first turn', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify(
          payload(
            JSON.stringify({
              scene: {
                text: 'Sous une pluie de néons, deux silhouettes découvrent un signal interdit.',
                location: 'Niveau 47',
                sceneTime: 'Nuit synthétique',
              },
              proposedIntentions: intentions(),
            }),
          ),
        ),
        { status: 200 },
      ),
    );

    await expect(
      callGeminiOpeningTurn(cyberpunkContext(), characterIds, 'gemini-2.5-flash', 'key', fetcher, {
        log: vi.fn(),
        error: vi.fn(),
      }),
    ).resolves.toMatchObject({
      scene: { location: 'Niveau 47' },
    });

    const [, request] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(request.body).toContain('openingMission');
    expect(request.body).toContain('game_world_settings');
    expect(request.body).toContain('universe_type: cyberpunk');
    expect(request.body).toContain('forbidden_elements: torture');
    expect(request.body).toContain('Nyx');
    expect(request.body).toContain('Oran');
  });

  it('builds different explicit mock openings for different worlds only when mock is selected', async () => {
    const configuration: AiConfiguration = { provider: 'mock', model: null, apiKey: null };
    const cyberpunk = await generateOpeningTurn(configuration, cyberpunkContext(), characterIds);
    const fantasy = await generateOpeningTurn(configuration, fantasyContext(), characterIds);

    expect(cyberpunk.sceneText).toContain('cyberpunk');
    expect(fantasy.sceneText).toContain('fantasy');
    expect(cyberpunk.sceneText).not.toBe(fantasy.sceneText);
  });

  it('does not call mock when Gemini is configured and propagates Gemini failures', async () => {
    const configuration: AiConfiguration = {
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      apiKey: 'key',
    };
    const gemini = vi.fn().mockRejectedValue(new GeminiResponseError('invalid_ai_response'));
    const mock = vi.fn(() => buildMockOpeningTurn(cyberpunkContext()));

    await expect(
      generateOpeningTurn(configuration, cyberpunkContext(), characterIds, { gemini, mock }),
    ).rejects.toBeInstanceOf(GeminiResponseError);
    expect(gemini).toHaveBeenCalledOnce();
    expect(mock).not.toHaveBeenCalled();
  });

  it('rejects the old static opening fallback as runtime output', () => {
    expect(() =>
      validateAndNormalizeOpeningTurn(
        {
          scene: {
            text: 'Le monde retient son souffle. Un message inattendu vient de relier les deux personnages, mais son origine reste incertaine.',
            location: 'Le seuil de l’aventure',
            sceneTime: 'Premier soir',
          },
          proposedIntentions: {
            'character-cyber': [
              {
                id: 'character-cyber-1-observe',
                label: 'Observer les détails',
                description: 'Lire les signes discrets de la scène.',
              },
              {
                id: 'character-cyber-1-act',
                label: 'Prendre l’initiative',
                description: 'Agir directement selon ses valeurs.',
              },
            ],
            'character-fantasy': [
              {
                id: 'character-fantasy-1-observe',
                label: 'Observer les détails',
                description: 'Lire les signes discrets de la scène.',
              },
              {
                id: 'character-fantasy-1-act',
                label: 'Prendre l’initiative',
                description: 'Agir directement selon ses valeurs.',
              },
            ],
          },
        },
        characterIds,
      ),
    ).toThrowError(new OpeningTurnValidationError('static_opening_fallback_rejected'));
  });
});

function cyberpunkContext(): OpeningTurnContext {
  return {
    game: { id: 'game-cyberpunk', title: 'Néon interdit' },
    world: { public_state: 'Une mégalopole verticale sous surveillance.' },
    worldSettings: {
      preset: 'cyberpunk',
      universe_type: 'cyberpunk',
      magic_level: 'none',
      technology_level: 'very_advanced',
      atmospheres: ['dark', 'mysterious'],
      forbidden_elements: ['torture'],
    },
    foundationalWorldRules:
      '=== REGLES FONDATRICES DU MONDE ===\ngame_world_settings\nuniverse_type: cyberpunk\nmagic_level: none\ntechnology_level: very_advanced\nforbidden_elements: torture',
    openingMission:
      'Installer le monde, présenter les deux personnages et proposer une première situation ouverte.',
    characters: [
      { id: 'character-cyber', name: 'Nyx', backstory: 'Ancienne enquêtrice des bas-fonds.' },
      { id: 'character-fantasy', name: 'Oran', backstory: 'Technicien d’une tour orbitale.' },
    ],
    goals: [],
  } as OpeningTurnContext;
}

function fantasyContext(): OpeningTurnContext {
  return {
    ...cyberpunkContext(),
    game: { id: 'game-fantasy', title: 'La source des astres' },
    worldSettings: {
      preset: 'classic_fantasy',
      universe_type: 'fantasy',
      magic_level: 'very_present',
      technology_level: 'medieval',
      atmospheres: ['adventurous', 'epic'],
      forbidden_elements: ['animal_violence'],
    },
    foundationalWorldRules:
      '=== REGLES FONDATRICES DU MONDE ===\ngame_world_settings\nuniverse_type: fantasy\nmagic_level: very_present\ntechnology_level: medieval\nforbidden_elements: animal_violence',
  };
}

function intentions() {
  return {
    'character-cyber': [
      {
        id: 'character-cyber-1-read',
        label: 'Analyser le signal',
        description: 'Chercher une piste.',
      },
      {
        id: 'character-cyber-1-move',
        label: 'Changer d’angle',
        description: 'Avancer sans subir.',
      },
    ],
    'character-fantasy': [
      {
        id: 'character-fantasy-1-read',
        label: 'Écouter le monde',
        description: 'Observer le lieu.',
      },
      {
        id: 'character-fantasy-1-move',
        label: 'Tenter un geste',
        description: 'Entrer dans la scène.',
      },
    ],
  };
}
