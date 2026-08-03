import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { GameService } from '../core/game.service';
import type { LocalAdventure, TurnSubmissionStatus } from '../core/game.service';
import { GamePage } from './game.page';

type TestPageInternals = {
  syncSubmissionStatusForCurrentTurn(): Promise<void>;
};

const syncSubmissionStatus = (page: GamePage) =>
  (page as unknown as TestPageInternals).syncSubmissionStatusForCurrentTurn();

const character = (id: string, ownerId: string) => ({
  id,
  gameId: 'game-1',
  ownerId,
  name: id,
  pronouns: null,
  ageDescription: null,
  appearance: '',
  personalityTraits: [],
  values: [],
  fears: [],
  strengths: [],
  weaknesses: [],
  backstory: '',
  freeformDescription: '',
  currentEmotionalState: [],
  avatarUrl: null,
  createdAt: '',
  updatedAt: '',
});

const adventure = (turnId = 'turn-1'): LocalAdventure => ({
  id: 'game-1',
  title: 'Test',
  inviteCode: 'TEST',
  status: 'active',
  playMode: 'asynchronous',
  turnNumber: 1,
  updatedAt: '',
  ownerId: 'alice',
  playerIds: ['alice', 'bob'],
  timerSeconds: null,
  world: {
    genre: '',
    customDescription: '',
    tone: [],
    realismLevel: 'grounded',
    violenceLevel: 'none',
    romanceEnabled: false,
    characterDeathEnabled: false,
    customRules: [],
    forbiddenElements: [],
  },
  characters: [character('Ariane', 'alice'), character('Bastien', 'bob')],
  goals: [],
  turns: [
    {
      id: turnId,
      number: 1,
      scene: '',
      location: '',
      resolution: null,
      intentions: {},
      decisions: [],
      createdAt: new Date().toISOString(),
    },
  ],
  memories: [],
});

describe('GamePage partner submission status', () => {
  const user = signal({ id: 'alice', email: 'alice@example.test', displayName: 'Alice' });
  let currentGame: LocalAdventure;
  let statuses: TurnSubmissionStatus[];
  let getStatus: ReturnType<typeof vi.fn>;
  let page: GamePage;

  beforeEach(() => {
    vi.useFakeTimers();
    currentGame = adventure();
    statuses = [
      { playerId: 'alice', submitted: false },
      { playerId: 'bob', submitted: false },
    ];
    getStatus = vi.fn(async () => statuses);
    TestBed.configureTestingModule({
      imports: [GamePage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'game-1' } } } },
        { provide: AuthService, useValue: { user, supabase: null } },
        {
          provide: GameService,
          useValue: {
            load: vi.fn(async () => currentGame),
            getTurnSubmissionStatus: getStatus,
            resolveCurrentTurn: vi.fn(),
          },
        },
      ],
    });
    page = TestBed.runInInjectionContext(() => new GamePage());
  });

  afterEach(() => {
    page.ngOnDestroy();
    vi.useRealTimers();
  });

  it('keeps thinking visible while refreshes are in progress and never exposes syncing', async () => {
    let finish!: (value: TurnSubmissionStatus[]) => void;
    getStatus.mockImplementationOnce(
      () => new Promise<TurnSubmissionStatus[]>((resolve) => (finish = resolve)),
    );
    page.game.set(currentGame);
    const refresh = syncSubmissionStatus(page);

    expect(page.isSubmissionStatusRefreshing()).toBe(true);
    expect(page.partnerStatus()).toBe('En réflexion…');
    expect(page.partnerStatus()).not.toBe('Synchronisation…');

    finish(statuses);
    await refresh;
  });

  it('polls while thinking, locks silently, then stops periodic status requests', async () => {
    await page.ngOnInit();
    await vi.advanceTimersByTimeAsync(6_000);
    expect(getStatus).toHaveBeenCalledTimes(3);
    expect(page.partnerStatus()).toBe('En réflexion…');

    statuses = [
      { playerId: 'alice', submitted: false },
      { playerId: 'bob', submitted: true },
    ];
    await vi.advanceTimersByTimeAsync(3_000);
    expect(page.partnerStatus()).toBe('Décision verrouillée');
    const callsAfterLock = getStatus.mock.calls.length;

    await vi.advanceTimersByTimeAsync(9_000);
    expect(getStatus).toHaveBeenCalledTimes(callsAfterLock);
  });

  it('starts one fresh poll for a new turn and ignores a late response from the old turn', async () => {
    let finishOld!: (value: TurnSubmissionStatus[]) => void;
    getStatus.mockImplementationOnce(
      () => new Promise<TurnSubmissionStatus[]>((resolve) => (finishOld = resolve)),
    );
    page.game.set(currentGame);
    const oldRefresh = syncSubmissionStatus(page);

    currentGame = adventure('turn-2');
    page.game.set(currentGame);
    statuses = [
      { playerId: 'alice', submitted: false },
      { playerId: 'bob', submitted: false },
    ];
    await syncSubmissionStatus(page);
    finishOld([
      { playerId: 'alice', submitted: true },
      { playerId: 'bob', submitted: true },
    ]);
    await oldRefresh;

    expect(page.partnerStatus()).toBe('En réflexion…');
    const callsBeforePoll = getStatus.mock.calls.length;
    await vi.advanceTimersByTimeAsync(3_000);
    expect(getStatus).toHaveBeenCalledTimes(callsBeforePoll + 1);
  });

  it('cleans up status polling on destruction', async () => {
    await page.ngOnInit();
    const callsBeforeDestroy = getStatus.mock.calls.length;
    page.ngOnDestroy();

    await vi.advanceTimersByTimeAsync(9_000);
    expect(getStatus).toHaveBeenCalledTimes(callsBeforeDestroy);
  });
});
