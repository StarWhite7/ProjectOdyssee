const FINAL_PUNCTUATION = /[.!?…]+$/u;

export function normalizeAction(action: string | undefined): string {
  return (action ?? '')
    .trim()
    .replace(/\s+/gu, ' ')
    .replace(FINAL_PUNCTUATION, '')
    .trim()
    .toLocaleLowerCase('fr');
}

function displayAction(action: string | undefined): string {
  return (action ?? '')
    .trim()
    .replace(/\s+/gu, ' ')
    .replace(FINAL_PUNCTUATION, '')
    .trim()
    .toLocaleLowerCase('fr');
}

function asDeComplement(action: string): string {
  return action.replace(/^de\s+/iu, '');
}

export function buildMockResolutionNarration(actions: Array<string | undefined>): string {
  const first = displayAction(actions[0]);
  const second = displayAction(actions[1]);

  if (!first && !second) {
    return 'Les deux initiatives se rencontrent et déplacent l’équilibre de la situation. Leur combinaison révèle une piste nouvelle sans refermer leurs possibilités.';
  }

  if (!first || !second) {
    const available = asDeComplement(first || second);
    return `En choisissant de ${available}, les personnages déplacent l’équilibre de la situation. Cette initiative révèle une piste nouvelle sans refermer leurs possibilités.`;
  }

  if (normalizeAction(first) === normalizeAction(second)) {
    return `En choisissant tous deux de ${asDeComplement(first)}, les personnages déplacent l’équilibre de la situation. Leur action commune révèle une piste nouvelle sans refermer leurs possibilités.`;
  }

  return `Les deux initiatives se rencontrent : tandis que l’un tente de ${asDeComplement(first)}, l’autre choisit de ${asDeComplement(second)}. Leur combinaison révèle une piste nouvelle sans refermer leurs possibilités.`;
}
