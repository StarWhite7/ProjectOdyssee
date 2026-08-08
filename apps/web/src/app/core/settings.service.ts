import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { APP_VERSION } from './app-version';

export type SettingsProfile = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  emailConfirmed: boolean | null;
  providers: string[];
  appVersion: string;
};

type ProfileRow = {
  display_name?: unknown;
  avatar_url?: unknown;
};

type AuthIdentity = {
  provider?: unknown;
};

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
        avatarUrl: null,
        emailConfirmed: null,
        providers: [],
        appVersion: APP_VERSION,
      };
    }

    const [profileResult, authResult] = await Promise.all([
      client.from('profiles').select('display_name,avatar_url').eq('id', user.id).maybeSingle(),
      client.auth.getUser(),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (authResult.error) throw authResult.error;

    const profile = profileResult.data as ProfileRow | null;
    const authUser = authResult.data.user;
    const displayName = this.stringValue(profile?.display_name)?.trim() || user.displayName;
    return {
      id: user.id,
      email: authUser?.email ?? user.email,
      displayName,
      avatarUrl: this.stringValue(profile?.avatar_url),
      emailConfirmed: authUser?.email_confirmed_at ? true : false,
      providers: this.providers(authUser?.identities as AuthIdentity[] | undefined),
      appVersion: APP_VERSION,
    };
  }

  async updateDisplayName(displayName: string): Promise<SettingsProfile | null> {
    const normalized = displayName.trim();
    if (normalized.length < 1 || normalized.length > 80) {
      throw new Error('Le pseudo doit contenir entre 1 et 80 caractères.');
    }

    const user = this.auth.user();
    if (!user) return null;
    const client = this.auth.supabase;
    if (client) {
      const { error } = await client
        .from('profiles')
        .update({ display_name: normalized })
        .eq('id', user.id);
      if (error) throw error;
    }

    this.auth.setCurrentDisplayName(normalized);
    return this.load();
  }

  private providers(identities: AuthIdentity[] | undefined): string[] {
    const values = identities
      ?.map((identity) => this.stringValue(identity.provider))
      .filter((provider): provider is string => Boolean(provider));
    return [...new Set(values ?? [])].sort((a, b) => a.localeCompare(b, 'fr-FR'));
  }

  private stringValue(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }
}
