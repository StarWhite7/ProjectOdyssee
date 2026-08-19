import { inject, Injectable, isDevMode } from '@angular/core';
import { AuthService } from './auth.service';
import { APP_VERSION } from './app-version';

export type FriendRequestPolicy = 'everyone' | 'nobody';
export type GameInvitationPolicy = 'friends' | 'nobody';
export type ProfileVisibility = 'public' | 'friends';

export type SettingsPreferences = {
  friendRequestPolicy: FriendRequestPolicy;
  gameInvitationPolicy: GameInvitationPolicy;
  profileVisibility: ProfileVisibility;
  searchableByPseudo: boolean;
};

export type SettingsBlockedUser = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
};

export type SettingsProfile = {
  id: string;
  email: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  emailConfirmed: boolean | null;
  providers: string[];
  preferences: SettingsPreferences;
  blockedUsers: SettingsBlockedUser[];
  appVersion: string;
};

type ProfileRow = {
  display_name?: unknown;
  avatar_url?: unknown;
  bio?: unknown;
  banner_url?: unknown;
};

type PreferenceRow = {
  friend_request_policy?: unknown;
  game_invitation_policy?: unknown;
  profile_visibility?: unknown;
  searchable_by_pseudo?: unknown;
};

type AuthIdentity = {
  provider?: unknown;
};

type BlockRow = {
  blocked_id?: unknown;
  blocked?: ProfileRow | ProfileRow[] | null;
};

const DEFAULT_PREFERENCES: SettingsPreferences = {
  friendRequestPolicy: 'everyone',
  gameInvitationPolicy: 'friends',
  profileVisibility: 'public',
  searchableByPseudo: true,
};

const PROFILE_BUCKET = 'profile-media';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly auth = inject(AuthService);

  async load(): Promise<SettingsProfile | null> {
    const user = this.auth.user();
    if (!user) return null;
    const client = this.auth.supabase;

    if (!client) {
      return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        bio: '',
        avatarUrl: null,
        bannerUrl: null,
        emailConfirmed: null,
        providers: [],
        preferences: DEFAULT_PREFERENCES,
        blockedUsers: [],
        appVersion: APP_VERSION,
      };
    }

    const [profileResult, preferencesResult, blocksResult, authResult] = await Promise.all([
      client
        .from('profiles')
        .select('display_name,avatar_url,bio,banner_url')
        .eq('id', user.id)
        .maybeSingle(),
      client
        .from('user_preferences')
        .select(
          'friend_request_policy,game_invitation_policy,profile_visibility,searchable_by_pseudo',
        )
        .eq('user_id', user.id)
        .maybeSingle(),
      client
        .from('user_blocks')
        .select(
          'blocked_id, blocked:profiles!user_blocks_blocked_id_fkey(display_name, avatar_url)',
        )
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false }),
      client.auth.getUser(),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (preferencesResult.error) throw preferencesResult.error;
    if (blocksResult.error) throw blocksResult.error;
    if (authResult.error) throw authResult.error;

    const profile = profileResult.data as ProfileRow | null;
    const authUser = authResult.data.user;
    const displayName = this.stringValue(profile?.display_name)?.trim() || user.displayName;

    return {
      id: user.id,
      email: authUser?.email ?? user.email,
      displayName,
      bio: this.stringValue(profile?.bio) ?? '',
      avatarUrl: this.stringValue(profile?.avatar_url),
      bannerUrl: this.stringValue(profile?.banner_url),
      emailConfirmed: authUser?.email_confirmed_at ? true : false,
      providers: this.providers(authUser?.identities as AuthIdentity[] | undefined),
      preferences: this.preferences(preferencesResult.data as PreferenceRow | null),
      blockedUsers: this.blockedUsers((blocksResult.data ?? []) as BlockRow[]),
      appVersion: APP_VERSION,
    };
  }

  async updateProfile(input: {
    displayName: string;
    bio: string;
  }): Promise<SettingsProfile | null> {
    const displayName = input.displayName.trim();
    const bio = input.bio.trim();
    if (displayName.length < 1 || displayName.length > 80) {
      throw new Error('Le pseudo doit contenir entre 1 et 80 caracteres.');
    }
    if (bio.length > 200) {
      throw new Error('La presentation ne peut pas depasser 200 caracteres.');
    }

    const user = this.auth.user();
    if (!user) return null;
    const client = this.auth.supabase;
    if (client) {
      const payload = { display_name: displayName, bio, updated_at: new Date().toISOString() };
      const { error } = await client.from('profiles').update(payload).eq('id', user.id);
      if (error) {
        this.logSupabaseError('Profile update failed', error, {
          table: 'profiles',
          filter: { id: user.id },
          payload,
        });
        throw error;
      }
    }

    this.auth.setCurrentDisplayName(displayName);
    try {
      return await this.load();
    } catch (error) {
      this.logSupabaseError('Profile reload failed after update', error);
      throw error;
    }
  }

  async updateDisplayName(displayName: string): Promise<SettingsProfile | null> {
    const current = await this.load();
    return this.updateProfile({ displayName, bio: current?.bio ?? '' });
  }

  async uploadProfileImage(kind: 'avatar' | 'banner', file: File): Promise<SettingsProfile | null> {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      throw new Error('Format image non supporte.');
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error('Image trop lourde.');
    }

    const user = this.auth.user();
    if (!user) return null;
    const client = this.requireClient();
    const extension = this.extension(file);
    const path = `${user.id}/${kind}-${Date.now()}.${extension}`;
    const { error: uploadError } = await client.storage.from(PROFILE_BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: true,
    });
    if (uploadError) throw uploadError;

    const { data } = client.storage.from(PROFILE_BUCKET).getPublicUrl(path);
    const column = kind === 'avatar' ? 'avatar_url' : 'banner_url';
    const { error: updateError } = await client
      .from('profiles')
      .update({ [column]: data.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (updateError) {
      this.logSupabaseError('Profile media update failed', updateError, {
        table: 'profiles',
        filter: { id: user.id },
        column,
      });
      throw updateError;
    }

    return this.load();
  }

  async updatePreferences(input: SettingsPreferences): Promise<SettingsProfile | null> {
    const user = this.auth.user();
    if (!user) return null;
    const client = this.requireClient();
    const preferences = this.normalizePreferences(input);
    const { error } = await client.from('user_preferences').upsert({
      user_id: user.id,
      friend_request_policy: preferences.friendRequestPolicy,
      game_invitation_policy: preferences.gameInvitationPolicy,
      profile_visibility: preferences.profileVisibility,
      searchable_by_pseudo: preferences.searchableByPseudo,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return this.load();
  }

  async updateEmail(email: string): Promise<void> {
    const normalized = email.trim();
    if (!normalized.includes('@')) throw new Error('Adresse e-mail invalide.');
    const client = this.requireClient();
    const { error } = await client.auth.updateUser({ email: normalized });
    if (error) throw error;
  }

  async updatePassword(password: string): Promise<void> {
    if (password.length < 8)
      throw new Error('Le mot de passe doit contenir au moins 8 caracteres.');
    const client = this.requireClient();
    const { error } = await client.auth.updateUser({ password });
    if (error) throw error;
  }

  async unblockUser(userId: string): Promise<SettingsProfile | null> {
    const client = this.requireClient();
    const { error } = await client.rpc('unblock_user', { target_user_id: userId });
    if (error) throw error;
    return this.load();
  }

  async deleteAccount(confirmation: string): Promise<void> {
    if (confirmation !== 'SUPPRIMER') throw new Error('Confirmation requise.');
    const client = this.requireClient();
    const { error } = await client.functions.invoke('delete-account', {
      body: { confirmation },
    });
    if (error) throw error;
  }

  private requireClient() {
    const client = this.auth.supabase;
    if (!client) throw new Error('Backend Supabase indisponible en mode demonstration.');
    return client;
  }

  private preferences(row: PreferenceRow | null): SettingsPreferences {
    return this.normalizePreferences({
      friendRequestPolicy: this.stringValue(row?.friend_request_policy),
      gameInvitationPolicy: this.stringValue(row?.game_invitation_policy),
      profileVisibility: this.stringValue(row?.profile_visibility),
      searchableByPseudo:
        typeof row?.searchable_by_pseudo === 'boolean' ? row.searchable_by_pseudo : true,
    });
  }

  private normalizePreferences(input: {
    friendRequestPolicy?: unknown;
    gameInvitationPolicy?: unknown;
    profileVisibility?: unknown;
    searchableByPseudo?: unknown;
  }): SettingsPreferences {
    return {
      friendRequestPolicy:
        input.friendRequestPolicy === 'nobody' || input.friendRequestPolicy === 'everyone'
          ? input.friendRequestPolicy
          : DEFAULT_PREFERENCES.friendRequestPolicy,
      gameInvitationPolicy:
        input.gameInvitationPolicy === 'nobody' || input.gameInvitationPolicy === 'friends'
          ? input.gameInvitationPolicy
          : DEFAULT_PREFERENCES.gameInvitationPolicy,
      profileVisibility:
        input.profileVisibility === 'friends' || input.profileVisibility === 'public'
          ? input.profileVisibility
          : DEFAULT_PREFERENCES.profileVisibility,
      searchableByPseudo:
        typeof input.searchableByPseudo === 'boolean'
          ? input.searchableByPseudo
          : DEFAULT_PREFERENCES.searchableByPseudo,
    };
  }

  private blockedUsers(rows: BlockRow[]): SettingsBlockedUser[] {
    return rows.flatMap((row) => {
      const userId = this.stringValue(row.blocked_id);
      const profile = this.single(row.blocked);
      const displayName = this.stringValue(profile?.display_name);
      if (!userId || !displayName) return [];
      return [
        {
          userId,
          displayName,
          avatarUrl: this.stringValue(profile?.avatar_url),
        },
      ];
    });
  }

  private providers(identities: AuthIdentity[] | undefined): string[] {
    const values = identities
      ?.map((identity) => this.stringValue(identity.provider))
      .filter((provider): provider is string => Boolean(provider));
    const providers = new Set(values ?? []);
    if (providers.has('email')) return [...providers].sort((a, b) => a.localeCompare(b, 'fr-FR'));
    return [...providers].sort((a, b) => a.localeCompare(b, 'fr-FR'));
  }

  private extension(file: File): string {
    if (file.type === 'image/jpeg') return 'jpg';
    if (file.type === 'image/webp') return 'webp';
    if (file.type === 'image/gif') return 'gif';
    return 'png';
  }

  private single<T>(value: T | T[] | null | undefined): T | null {
    return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
  }

  private stringValue(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private logSupabaseError(message: string, error: unknown, context?: unknown): void {
    if (!isDevMode()) return;
    console.error(message, { error, context });
  }
}
