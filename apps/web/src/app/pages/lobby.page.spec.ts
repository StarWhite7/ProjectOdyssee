import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { GameService } from '../core/game.service';
import type { LocalAdventure } from '../core/game.service';
import { InvitationsService } from '../core/invitations.service';
import { LobbyPage } from './lobby.page';

describe('LobbyPage deletion navigation', () => {
  const game = signal<LocalAdventure>(adventure());
  const gameService = {
    startIfReady: vi.fn<() => Promise<'already_started' | 'waiting_for_characters'>>(),
    load: vi.fn<() => Promise<LocalAdventure>>(),
    isGameMissingError: vi.fn<() => boolean>(),
  };
  const invitationsService = {
    load: vi.fn(),
    inviteFriendToGame: vi.fn(),
  };

  beforeEach(() => {
    game.set(adventure());
    gameService.startIfReady.mockResolvedValue('waiting_for_characters');
    gameService.load.mockImplementation(() => Promise.resolve(game()));
    gameService.isGameMissingError.mockReturnValue(false);
    invitationsService.load.mockResolvedValue(socialData());
    invitationsService.inviteFriendToGame.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      imports: [LobbyPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'game-1' } } } },
        {
          provide: AuthService,
          useValue: {
            user: signal({ id: 'alice', email: 'alice@example.test', displayName: 'Alice' }),
          },
        },
        { provide: GameService, useValue: gameService },
        { provide: InvitationsService, useValue: invitationsService },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('navigates to the clean dashboard URL with a deletion notification state', async () => {
    const page = TestBed.runInInjectionContext(() => new LobbyPage());
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await page.onGameDeleted();

    expect(navigate).toHaveBeenCalledWith(['/dashboard'], {
      state: {
        notification: {
          type: 'success',
          code: 'adventure-deleted',
        },
      },
    });
    expect(navigate.mock.calls[0]?.[1]).not.toHaveProperty('queryParams');
  });

  it('displays only real friends returned by the social service in the lobby', async () => {
    const { element } = await render();

    expect(invitationsService.load).toHaveBeenCalled();
    expect(element.textContent).toContain('Kael');
    expect(element.textContent).not.toContain('Ami fictif');
  });

  it('shows world options only before the narrative startup', async () => {
    const waiting = await render();
    expect(waiting.element.textContent).toContain('Options du monde');

    TestBed.resetTestingModule();
    game.set(adventure({ status: 'active' }));
    gameService.startIfReady.mockResolvedValue('already_started');
    gameService.load.mockImplementation(() => Promise.resolve(game()));
    gameService.isGameMissingError.mockReturnValue(false);
    invitationsService.load.mockResolvedValue(socialData());
    TestBed.configureTestingModule({
      imports: [LobbyPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'game-1' } } } },
        {
          provide: AuthService,
          useValue: {
            user: signal({ id: 'alice', email: 'alice@example.test', displayName: 'Alice' }),
          },
        },
        { provide: GameService, useValue: gameService },
        { provide: InvitationsService, useValue: invitationsService },
      ],
    });

    const active = await render();
    expect(active.element.textContent).not.toContain('Options du monde');
  });

  it('sends a game invitation with the real game id and friend user id', async () => {
    const { fixture, element } = await render();
    const inviteButton = buttonByText(element, 'Inviter');

    inviteButton.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(invitationsService.inviteFriendToGame).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'friend-1', displayName: 'Kael' }),
      'game-1',
    );
    expect(fixture.componentInstance.lobbyFriends()[0].inviteState).toBe('pending');
  });

  it('does not send duplicate invitations while one invite is already running', async () => {
    let resolveInvite!: () => void;
    invitationsService.inviteFriendToGame.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveInvite = resolve;
      }),
    );
    const { fixture } = await render();
    const friend = fixture.componentInstance.lobbyFriends()[0];

    void fixture.componentInstance.inviteFriend(friend);
    void fixture.componentInstance.inviteFriend(friend);

    expect(invitationsService.inviteFriendToGame).toHaveBeenCalledTimes(1);
    resolveInvite();
    await fixture.whenStable();
  });

  it('disables friends that already have a pending invitation for this adventure', async () => {
    invitationsService.load.mockResolvedValue(
      socialData({
        sent: [
          {
            id: 'invite-1',
            direction: 'sent',
            adventureId: 'game-1',
            adventureTitle: 'Salon test',
            otherUserId: 'friend-1',
            otherUserName: 'Kael',
            otherUserAvatarUrl: null,
            status: 'pending',
            createdAt: null,
            coverImageUrl: '/images/dashboard/AventureEnCours.png',
            canRespond: false,
          },
        ],
      }),
    );

    const { fixture, element } = await render();
    const friend = fixture.componentInstance.lobbyFriends()[0];
    const disabledButtons = Array.from(element.querySelectorAll('button')).filter(
      (button) => button.disabled,
    );

    expect(friend.inviteState).toBe('pending');
    expect(disabledButtons.some((button) => button.textContent?.includes('Invitation'))).toBe(true);
  });

  it('marks a friend as already present when their user id is part of the game players', async () => {
    game.set(adventure({ playerIds: ['alice', 'friend-1'] }));

    const { fixture } = await render();

    expect(fixture.componentInstance.lobbyFriends()[0].inviteState).toBe('member');
  });

  async function render(): Promise<{
    fixture: ReturnType<typeof TestBed.createComponent<LobbyPage>>;
    element: HTMLElement;
  }> {
    const fixture = TestBed.createComponent(LobbyPage);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.loading()).toBe(false));
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  function buttonByText(element: HTMLElement, text: string): HTMLButtonElement {
    const button = Array.from(element.querySelectorAll('button')).find((candidate) =>
      candidate.textContent?.includes(text),
    );
    if (!(button instanceof HTMLButtonElement)) throw new Error(`Button ${text} not found`);
    return button;
  }

  function adventure(patch: Partial<LocalAdventure> = {}): LocalAdventure {
    return {
      id: 'game-1',
      title: 'Salon test',
      inviteCode: 'ABC-123',
      ownerId: 'alice',
      playerIds: ['alice'],
      status: 'waiting',
      playMode: 'asynchronous',
      timerSeconds: null,
      turnNumber: 0,
      updatedAt: '2026-08-08T10:00:00.000Z',
      world: {
        genre: 'Fantasy',
        customDescription: '',
        tone: ['mystere'],
        realismLevel: 'flexible',
        violenceLevel: 'light',
        romanceEnabled: false,
        characterDeathEnabled: false,
        customRules: [],
        forbiddenElements: [],
      },
      characters: [],
      goals: [],
      turns: [],
      memories: [],
      ...patch,
    };
  }

  function socialData(patch: Record<string, unknown> = {}) {
    return {
      received: [],
      sent: [],
      receivedFriendRequests: [],
      sentFriendRequests: [],
      friends: [{ userId: 'friend-1', displayName: 'Kael', avatarUrl: null, createdAt: null }],
      recentCompanions: [],
      blockedUsers: [],
      availableAdventures: [],
      invitationBackendAvailable: true,
      ...patch,
    };
  }
});
