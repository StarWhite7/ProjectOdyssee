import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { GameService } from '../core/game.service';
import type { LocalAdventure } from '../core/game.service';
import { DetailsPage } from './details.page';

describe('DetailsPage', () => {
  const user = signal({ id: 'user-1', email: 'mara@example.com', displayName: 'Mara' });
  const gameService = {
    load: vi.fn<(id: string) => Promise<LocalAdventure>>(),
  };

  beforeEach(async () => {
    gameService.load.mockReset();
    await TestBed.configureTestingModule({
      imports: [DetailsPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: 'game-1', section: 'journal' }),
            },
          },
        },
        {
          provide: AuthService,
          useValue: {
            user: user.asReadonly(),
          },
        },
        { provide: GameService, useValue: gameService },
      ],
    }).compileComponents();
  });

  it('shows a loading state before the adventure resolves', () => {
    gameService.load.mockReturnValue(new Promise(() => undefined));

    const fixture = TestBed.createComponent(DetailsPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.loading()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain("Chargement de l'aventure");
  });

  it('renders the journal once the adventure is loaded', async () => {
    gameService.load.mockResolvedValue(adventure());

    const fixture = TestBed.createComponent(DetailsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(gameService.load).toHaveBeenCalledWith('game-1');
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.error()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Aventure test');
    expect(fixture.nativeElement.textContent).toContain('Tour 1');
  });

  it('shows a safe error state when loading fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    gameService.load.mockRejectedValue(new Error('raw database failure'));

    const fixture = TestBed.createComponent(DetailsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.error()).toBe('Réessayez dans quelques instants.');
    expect(fixture.nativeElement.textContent).toContain(
      'Impossible de charger cette aventure pour le moment.',
    );
    expect(fixture.nativeElement.textContent).not.toContain('raw database failure');

    consoleError.mockRestore();
  });

  it('retries the adventure loading request', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    gameService.load.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(adventure());

    const fixture = TestBed.createComponent(DetailsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    await fixture.componentInstance.retry();
    fixture.detectChanges();

    expect(gameService.load).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.error()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Aventure test');

    consoleError.mockRestore();
  });

  function adventure(): LocalAdventure {
    return {
      id: 'game-1',
      title: 'Aventure test',
      inviteCode: 'ABC123',
      ownerId: 'user-1',
      playerIds: ['user-1'],
      status: 'completed',
      playMode: 'asynchronous',
      timerSeconds: null,
      turnNumber: 1,
      updatedAt: '2026-08-04T10:00:00.000Z',
      world: {
        genre: 'Fantasy',
        customDescription: '',
        tone: [],
        realismLevel: 'flexible',
        violenceLevel: 'light',
        romanceEnabled: false,
        characterDeathEnabled: false,
        customRules: [],
        forbiddenElements: [],
      },
      characters: [],
      goals: [],
      turns: [
        {
          id: 'turn-1',
          number: 1,
          scene: 'Une scène de test.',
          location: 'Le seuil',
          resolution: null,
          intentions: {},
          decisions: [],
          createdAt: '2026-08-04T10:00:00.000Z',
        },
      ],
      memories: [],
    };
  }
});
