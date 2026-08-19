import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { SettingsService } from './settings.service';

type QueryBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
};

describe('SettingsService', () => {
  const user = signal({ id: 'user-1', email: 'mara@example.com', displayName: 'Mara' });
  const setCurrentDisplayName = vi.fn<(displayName: string) => void>();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads the current user profile, preferences, blocked users and auth providers', async () => {
    const profileQuery = selectQuery({
      display_name: 'Pseudo reel',
      avatar_url: 'avatar.png',
      bio: 'Bio reelle',
      banner_url: 'banner.png',
    });
    const preferencesQuery = selectQuery({
      friend_request_policy: 'nobody',
      game_invitation_policy: 'friends',
      profile_visibility: 'friends',
      searchable_by_pseudo: false,
    });
    const blocksQuery = listQuery([
      {
        blocked_id: 'blocked-1',
        blocked: { display_name: 'Nocturne', avatar_url: 'blocked.png' },
      },
    ]);
    configure({
      from: fromTables({
        profiles: profileQuery,
        user_preferences: preferencesQuery,
        user_blocks: blocksQuery,
      }),
      auth: authApi(),
    });

    const result = await TestBed.inject(SettingsService).load();

    expect(profileQuery.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(preferencesQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(blocksQuery.eq).toHaveBeenCalledWith('blocker_id', 'user-1');
    expect(result).toMatchObject({
      id: 'user-1',
      email: 'real@example.com',
      displayName: 'Pseudo reel',
      bio: 'Bio reelle',
      avatarUrl: 'avatar.png',
      bannerUrl: 'banner.png',
      emailConfirmed: true,
      providers: ['discord', 'google'],
      preferences: {
        friendRequestPolicy: 'nobody',
        gameInvitationPolicy: 'friends',
        profileVisibility: 'friends',
        searchableByPseudo: false,
      },
      blockedUsers: [{ userId: 'blocked-1', displayName: 'Nocturne', avatarUrl: 'blocked.png' }],
      appVersion: '0.1.0',
    });
  });

  it('updates only the current user profile fields', async () => {
    const updateQuery = mutationQuery();
    configure({
      from: fromTables({
        profiles: updateQuery,
        user_preferences: selectQuery(null),
        user_blocks: listQuery([]),
      }),
      auth: authApi(),
    });

    await TestBed.inject(SettingsService).updateProfile({
      displayName: '  Nouveau pseudo  ',
      bio: '  Nouvelle bio  ',
    });

    expect(updateQuery.update).toHaveBeenCalledWith({
      display_name: 'Nouveau pseudo',
      bio: 'Nouvelle bio',
      updated_at: expect.any(String),
    });
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(setCurrentDisplayName).toHaveBeenCalledWith('Nouveau pseudo');
  });

  it('logs and rethrows the exact Supabase error when profile update fails', async () => {
    const supabaseError = {
      code: '42501',
      message: 'permission denied for table profiles',
      details: null,
      hint: null,
    };
    const updateQuery = mutationQuery({ error: supabaseError });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    configure({
      from: fromTables({
        profiles: updateQuery,
        user_preferences: selectQuery(null),
        user_blocks: listQuery([]),
      }),
      auth: authApi(),
    });

    await expect(
      TestBed.inject(SettingsService).updateProfile({
        displayName: 'Mara',
        bio: 'Bio',
      }),
    ).rejects.toBe(supabaseError);

    expect(updateQuery.update).toHaveBeenCalledWith({
      display_name: 'Mara',
      bio: 'Bio',
      updated_at: expect.any(String),
    });
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(errorSpy).toHaveBeenCalledWith(
      'Profile update failed',
      expect.objectContaining({
        error: supabaseError,
        context: expect.objectContaining({
          table: 'profiles',
          filter: { id: 'user-1' },
        }),
      }),
    );
  });

  it('persists privacy preferences on the current user row', async () => {
    const preferencesQuery = mutationQuery();
    configure({
      from: fromTables({
        profiles: selectQuery({ display_name: 'Mara' }),
        user_preferences: preferencesQuery,
        user_blocks: listQuery([]),
      }),
      auth: authApi(),
    });

    await TestBed.inject(SettingsService).updatePreferences({
      friendRequestPolicy: 'nobody',
      gameInvitationPolicy: 'nobody',
      profileVisibility: 'friends',
      searchableByPseudo: false,
    });

    expect(preferencesQuery.upsert).toHaveBeenCalledWith({
      user_id: 'user-1',
      friend_request_policy: 'nobody',
      game_invitation_policy: 'nobody',
      profile_visibility: 'friends',
      searchable_by_pseudo: false,
      updated_at: expect.any(String),
    });
  });

  it('delegates account mutations and blocking actions to Supabase APIs', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const invoke = vi.fn().mockResolvedValue({ data: { status: 'deleted' }, error: null });
    const updateUser = vi.fn().mockResolvedValue({ error: null });
    configure({
      from: fromTables({
        profiles: selectQuery({ display_name: 'Mara' }),
        user_preferences: selectQuery(null),
        user_blocks: listQuery([]),
      }),
      auth: authApi({ updateUser }),
      rpc,
      functions: { invoke },
    });
    const service = TestBed.inject(SettingsService);

    await service.updateEmail('new@example.com');
    await service.updatePassword('password123');
    await service.unblockUser('blocked-1');
    await service.deleteAccount('SUPPRIMER');

    expect(updateUser).toHaveBeenCalledWith({ email: 'new@example.com' });
    expect(updateUser).toHaveBeenCalledWith({ password: 'password123' });
    expect(rpc).toHaveBeenCalledWith('unblock_user', { target_user_id: 'blocked-1' });
    expect(invoke).toHaveBeenCalledWith('delete-account', { body: { confirmation: 'SUPPRIMER' } });
  });

  it('rejects invalid profile and account inputs before writing', async () => {
    const updateQuery = mutationQuery();
    const updateUser = vi.fn();
    configure({
      from: fromTables({
        profiles: updateQuery,
        user_preferences: selectQuery(null),
        user_blocks: listQuery([]),
      }),
      auth: authApi({ updateUser }),
    });
    const service = TestBed.inject(SettingsService);

    await expect(service.updateProfile({ displayName: '', bio: '' })).rejects.toThrow(
      'Le pseudo doit contenir entre 1 et 80 caracteres.',
    );
    await expect(
      service.updateProfile({ displayName: 'Mara', bio: 'x'.repeat(201) }),
    ).rejects.toThrow('La presentation ne peut pas depasser 200 caracteres.');
    await expect(service.updateEmail('invalid')).rejects.toThrow('Adresse e-mail invalide.');
    await expect(service.updatePassword('short')).rejects.toThrow(
      'Le mot de passe doit contenir au moins 8 caracteres.',
    );

    expect(updateQuery.update).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
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

  function fromTables(tables: Record<string, QueryBuilder>): ReturnType<typeof vi.fn> {
    return vi.fn((table: string) => tables[table]);
  }

  function authApi(overrides: Partial<{ updateUser: ReturnType<typeof vi.fn> }> = {}) {
    return {
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
      updateUser: overrides.updateUser ?? vi.fn().mockResolvedValue({ error: null }),
    };
  }

  function selectQuery(data: unknown): QueryBuilder {
    const query = baseQuery();
    query.maybeSingle.mockResolvedValue({ data, error: null });
    return query;
  }

  function listQuery(data: unknown[]): QueryBuilder {
    const query = baseQuery();
    query.order.mockResolvedValue({ data, error: null });
    return query;
  }

  function mutationQuery(result: { error: unknown } = { error: null }): QueryBuilder {
    const query = baseQuery();
    let mutating = false;
    query.select.mockImplementation(() => {
      mutating = false;
      return query;
    });
    query.update.mockImplementation(() => {
      mutating = true;
      return query;
    });
    query.eq.mockImplementation(() => (mutating ? Promise.resolve(result) : query));
    query.upsert.mockResolvedValue(result);
    return query;
  }

  function baseQuery(): QueryBuilder {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => query),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    };
    return query;
  }
});
