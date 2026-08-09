import { GAME_STATUSES, getGameRouteSection, getMyAdventureRouteSection } from './game-status';

describe('game status routing', () => {
  it('routes active adventure statuses to the game page', () => {
    expect(getGameRouteSection(GAME_STATUSES.ACTIVE)).toBe('jouer');
    expect(getGameRouteSection(GAME_STATUSES.IN_PROGRESS)).toBe('jouer');
    expect(getGameRouteSection(GAME_STATUSES.STARTED)).toBe('jouer');
    expect(getGameRouteSection(GAME_STATUSES.PAUSED)).toBe('jouer');
  });

  it('routes waiting and ready statuses to the lobby', () => {
    expect(getGameRouteSection(GAME_STATUSES.WAITING)).toBe('salon');
    expect(getGameRouteSection(GAME_STATUSES.READY)).toBe('salon');
  });

  it('routes character creation to the character page', () => {
    expect(getGameRouteSection(GAME_STATUSES.CHARACTER_CREATION)).toBe('personnage');
  });

  it('routes completed adventure statuses to the journal', () => {
    expect(getGameRouteSection(GAME_STATUSES.COMPLETED)).toBe('journal');
    expect(getGameRouteSection(GAME_STATUSES.FINISHED)).toBe('journal');
    expect(getGameRouteSection(GAME_STATUSES.ARCHIVED)).toBe('journal');
    expect(getGameRouteSection(GAME_STATUSES.ABANDONED)).toBe('journal');
  });

  it('uses the lobby as a safe fallback for unknown statuses', () => {
    expect(getGameRouteSection('unexpected')).toBe('salon');
  });

  it('keeps my pending adventures on the lobby route without changing general game routing', () => {
    expect(getMyAdventureRouteSection(GAME_STATUSES.WAITING)).toBe('salon');
    expect(getMyAdventureRouteSection(GAME_STATUSES.CHARACTER_CREATION)).toBe('salon');
    expect(getGameRouteSection(GAME_STATUSES.CHARACTER_CREATION)).toBe('personnage');
  });
});
