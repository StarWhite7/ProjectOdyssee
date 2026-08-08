import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { SettingsService } from './settings.service';

type QueryBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  update?: ReturnType<typeof vi.fn>;
};

describe('SettingsService', () => {
  const user = signal({ id: 'user-1', email: 'mara@example.com', displayName: 'Mara' });
  const setCurrentDisplayName = vi.fn<(displayName: string) => void>();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads the current user profile without inventing unsupported fields', async () => {
    const profileQuery = selectProfileQuery({
      display_name: 'Pseudo reel',
      avatar_url: 'avatar.png',
    });
    configure({
      from: vi.fn(() => profileQuery),
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              email: 'real@example.com',
              email_confirmed_at: '2026-08-08T10:00:00.000Z',
              identities: [{ provider: 'google' }, { provider: 'discord' }],
            },
          },
          error: null,
        }),
      },
    });

    const result = await TestBed.inject(SettingsService).load();

    expect(profileQuery.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(result).toMatchObject({
      id: 'user-1',
      email: 'real@example.com',
      displayName: 'Pseudo reel',
      avatarUrl: 'avatar.png',
      emailConfirmed: true,
      providers: ['discord', 'google'],
      appVersion: '0.1.0',
    });
  });

  it('updates only the current user display_name', async () => {
    const updateQuery = updateProfileQuery();
    const profileQuery = selectProfileQuery({ display_name: 'Nouveau pseudo', avatar_url: null });
    configure({
      from: vi.fn((table: string) => (table === 'profiles' && updateQuery.used ? profileQuery : updateQuery)),
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { email: 'mara@example.com', email_confirmed_at: null, identities: [] } },
          error: null,
        }),
      },
    });

    await TestBed.inject(SettingsService).updateDisplayName('  Nouveau pseudo  ');

    expect(updateQuery.update).toHaveBeenCalledWith({ display_name: 'Nouveau pseudo' });
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(setCurrentDisplayName).toHaveBeenCalledWith('Nouveau pseudo');
  });

  it('rejects invalid display names before writing', async () => {
    const updateQuery = updateProfileQuery();
    configure({ from: vi.fn(() => updateQuery), auth: { getUser: vi.fn() } });

    await expect(TestBed.inject(SettingsService).updateDisplayName('')).rejects.toThrow(
      'Le pseudo doit contenir entre 1 et 80 caractères.',
    );

    expect(updateQuery.update).not.toHaveBeenCalled();
  });

  function configure(client: unknown): void {
    TestBed.configureTestingModule({
      providers: [
        SettingsService,
        {
          provide: AuthService,
          useValue: {
            user: user.asReadonly(),
            supabase: client,
            setCurrentDisplayName,
          },
        },
      ],
    });
  }

  function selectProfileQuery(data: unknown): QueryBuilder {
    const query: QueryBuilder = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(() => Promise.resolve({ data, error: null })),
    };
    return query;
  }

  function updateProfileQuery(): QueryBuilder & { used: boolean } {
    const query: QueryBuilder & { used: boolean } = {
      used: false,
      select: vi.fn(() => query),
      eq: vi.fn(() => {
        query.used = true;
        return Promise.resolve({ error: null });
      }),
      maybeSingle: vi.fn(),
      update: vi.fn(() => query),
    };
    return query;
  }
});
