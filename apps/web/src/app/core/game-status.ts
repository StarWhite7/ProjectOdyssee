export const GAME_STATUSES = {
  WAITING: 'waiting',
  CHARACTER_CREATION: 'character_creation',
  READY: 'ready',
  ACTIVE: 'active',
  IN_PROGRESS: 'in_progress',
  STARTED: 'started',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FINISHED: 'finished',
  ARCHIVED: 'archived',
  ABANDONED: 'abandoned',
} as const;

export type GameStatus = (typeof GAME_STATUSES)[keyof typeof GAME_STATUSES];
export type GameRouteSection = 'salon' | 'personnage' | 'jouer' | 'journal';

export const ACTIVE_GAME_STATUSES = [
  GAME_STATUSES.ACTIVE,
  GAME_STATUSES.IN_PROGRESS,
  GAME_STATUSES.STARTED,
  GAME_STATUSES.PAUSED,
] as const;

export const PENDING_GAME_STATUSES = [
  GAME_STATUSES.WAITING,
  GAME_STATUSES.CHARACTER_CREATION,
] as const;

export const COMPLETED_GAME_STATUSES = [
  GAME_STATUSES.COMPLETED,
  GAME_STATUSES.FINISHED,
  GAME_STATUSES.ARCHIVED,
  GAME_STATUSES.ABANDONED,
] as const;

export function isActiveGameStatus(status: string): boolean {
  return (ACTIVE_GAME_STATUSES as readonly string[]).includes(status);
}

export function isPendingGameStatus(status: string): boolean {
  return (PENDING_GAME_STATUSES as readonly string[]).includes(status);
}

export function isWorldSetupGameStatus(status: string): boolean {
  return (
    status === GAME_STATUSES.WAITING ||
    status === GAME_STATUSES.CHARACTER_CREATION ||
    status === GAME_STATUSES.READY
  );
}

export function isCompletedGameStatus(status: string): boolean {
  return (COMPLETED_GAME_STATUSES as readonly string[]).includes(status);
}

export function getGameRouteSection(status: string): GameRouteSection {
  if (isCompletedGameStatus(status)) return 'journal';
  if (isActiveGameStatus(status)) return 'jouer';
  if (status === GAME_STATUSES.CHARACTER_CREATION) return 'personnage';
  return 'salon';
}

export function getMyAdventureRouteSection(status: string): GameRouteSection {
  if (isPendingGameStatus(status)) return 'salon';
  return getGameRouteSection(status);
}

export function gameStatusLabel(status: string): string {
  switch (status) {
    case GAME_STATUSES.WAITING:
      return 'En attente';
    case GAME_STATUSES.CHARACTER_CREATION:
      return 'Pr\u00e9paration';
    case GAME_STATUSES.READY:
      return 'Pr\u00eate';
    case GAME_STATUSES.ACTIVE:
    case GAME_STATUSES.IN_PROGRESS:
    case GAME_STATUSES.STARTED:
      return 'En cours';
    case GAME_STATUSES.PAUSED:
      return 'En pause';
    case GAME_STATUSES.COMPLETED:
    case GAME_STATUSES.FINISHED:
    case GAME_STATUSES.ARCHIVED:
      return 'Termin\u00e9e';
    case GAME_STATUSES.ABANDONED:
      return 'Abandonn\u00e9e';
    default:
      return status.trim() || 'Statut indisponible';
  }
}
