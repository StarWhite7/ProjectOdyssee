import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { GameService } from './game.service';

type ResolveTurnInternals = { resolveTurn(turnId: string): Promise<string> };
type FakeClient = {
  functions: { invoke: ReturnType<typeof vi.fn> };
  rpc: ReturnType<typeof vi.fn>;
};

const resolveTurn = (service: GameService, turnId = 'turn-1') =>
  (service as unknown as ResolveTurnInternals).resolveTurn(turnId);

describe('GameService turn resolution transport', () => {
  let client: FakeClient | null;
  let service: GameService;

  beforeEach(() => {
    client = {
      functions: { invoke: vi.fn() },
      rpc: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        GameService,
        {
          provide: AuthService,
          useValue: {
            get supabase() {
              return client;
            },
          },
        },
      ],
    });
    service = TestBed.inject(GameService);
  });

  it('invokes resolve-turn exactly once with the current turn and never calls the Mock RPC', async () => {
    client!.functions.invoke.mockResolvedValue({ data: { status: 'resolved' }, error: null });

    await expect(resolveTurn(service, 'turn-42')).resolves.toBe('resolved');
    expect(client!.functions.invoke).toHaveBeenCalledOnce();
    expect(client!.functions.invoke).toHaveBeenCalledWith('resolve-turn', {
      body: { turnId: 'turn-42' },
    });
    expect(client!.rpc).not.toHaveBeenCalled();
  });

  it('returns requested when the Edge Function response has no status', async () => {
    client!.functions.invoke.mockResolvedValue({ data: {}, error: null });

    await expect(resolveTurn(service)).resolves.toBe('requested');
  });

  it('propagates Edge Function errors without a Mock fallback', async () => {
    const error = new Error('ai_temporarily_unavailable');
    client!.functions.invoke.mockResolvedValue({ data: null, error });

    await expect(resolveTurn(service)).rejects.toBe(error);
    expect(client!.functions.invoke).toHaveBeenCalledOnce();
    expect(client!.rpc).not.toHaveBeenCalled();
  });

  it('keeps local Mock resolution when no Supabase client exists', async () => {
    const remoteClient = client!;
    client = null;

    await expect(resolveTurn(service)).resolves.toBe('mock_local');
    expect(remoteClient.functions.invoke).not.toHaveBeenCalled();
    expect(remoteClient.rpc).not.toHaveBeenCalled();
  });

  it('deletes a Supabase game through the protected RPC and refreshes the list', async () => {
    client!.rpc.mockResolvedValue({ data: 'deleted', error: null });
    const refresh = vi.spyOn(service, 'refresh').mockResolvedValue();

    await expect(service.deleteGameForAll('game-42')).resolves.toBe('deleted');
    expect(client!.rpc).toHaveBeenCalledWith('delete_game_for_all', {
      target_game_id: 'game-42',
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('propagates deletion errors without mutating the local list', async () => {
    const error = new Error('forbidden');
    client!.rpc.mockResolvedValue({ data: null, error });
    const refresh = vi.spyOn(service, 'refresh');

    await expect(service.deleteGameForAll('game-42')).rejects.toBe(error);
    expect(refresh).not.toHaveBeenCalled();
  });
});
