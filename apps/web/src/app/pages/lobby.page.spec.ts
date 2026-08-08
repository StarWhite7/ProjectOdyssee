import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { GameService } from '../core/game.service';
import { LobbyPage } from './lobby.page';

describe('LobbyPage deletion navigation', () => {
  beforeEach(() => {
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
        {
          provide: GameService,
          useValue: {
            startIfReady: vi.fn(),
            load: vi.fn(),
            isGameMissingError: vi.fn(() => false),
          },
        },
      ],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('navigates to the clean dashboard URL with a deletion notification state', async () => {
    const page = TestBed.runInInjectionContext(() => new LobbyPage());
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await page.onGameDeleted();

    expect(navigate).toHaveBeenCalledWith(['/tableau-de-bord'], {
      state: {
        notification: {
          type: 'success',
          code: 'adventure-deleted',
        },
      },
    });
    expect(navigate.mock.calls[0]?.[1]).not.toHaveProperty('queryParams');
  });
});
