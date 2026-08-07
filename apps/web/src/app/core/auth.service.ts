import { computed, Injectable, signal } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import type { Provider, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, runtimeConfig } from './runtime-config';

export type AppUser = { id: string; email: string; displayName: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly client: SupabaseClient | null = isSupabaseConfigured
    ? createClient(runtimeConfig.supabaseUrl, runtimeConfig.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;
  private readonly currentUser = signal<AppUser | null>(this.restoreDemoUser());
  private readonly readyState = signal(!this.client);
  readonly user = this.currentUser.asReadonly();
  readonly ready = this.readyState.asReadonly();
  readonly authenticated = computed(() => this.currentUser() !== null);
  readonly backend = computed(() => (this.client ? 'supabase' : 'mock'));

  constructor() {
    if (this.client) {
      void this.client.auth.getSession().then(({ data }) => this.acceptSession(data.session));
      this.client.auth.onAuthStateChange((_event, session) => this.acceptSession(session));
    }
  }

  get supabase(): SupabaseClient | null {
    return this.client;
  }

  async signUp(email: string, password: string, displayName: string): Promise<string> {
    const normalizedEmail = email.trim();
    if (this.client) {
      const { data, error } = await this.client.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { display_name: displayName.trim() } },
      });
      if (error) throw error;
      if (data.session) this.acceptSession(data.session);
      return data.session
        ? 'Compte créé. Vous êtes connecté.'
        : 'Compte créé. Consultez votre email pour confirmer l’inscription.';
    }
    const user = {
      id: this.demoId(normalizedEmail),
      email: normalizedEmail,
      displayName: this.profileName({ displayName, email: normalizedEmail }),
    };
    sessionStorage.setItem('odyssee_demo_user', JSON.stringify(user));
    this.currentUser.set(user);
    return 'Session de démonstration créée.';
  }

  async signIn(email: string, password: string): Promise<void> {
    const normalizedEmail = email.trim();
    if (this.client) {
      const { data, error } = await this.client.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) throw error;
      this.acceptSession(data.session);
      return;
    }
    const user = {
      id: this.demoId(normalizedEmail),
      email: normalizedEmail,
      displayName: this.profileName({ email: normalizedEmail }),
    };
    sessionStorage.setItem('odyssee_demo_user', JSON.stringify(user));
    this.currentUser.set(user);
  }

  async signOut(): Promise<void> {
    if (this.client) await this.client.auth.signOut();
    sessionStorage.removeItem('odyssee_demo_user');
    this.currentUser.set(null);
  }

  async signInWithProvider(provider: Extract<Provider, 'google' | 'discord'>): Promise<void> {
    if (!this.client) throw new Error('OAuth indisponible en mode démonstration.');
    const { error } = await this.client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  }

  async resetPassword(email: string): Promise<void> {
    if (!this.client) return;
    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/mot-de-passe/reinitialiser`,
    });
    if (error) throw error;
  }

  async updatePassword(password: string): Promise<void> {
    if (!this.client) throw new Error('Réinitialisation indisponible en mode démonstration.');
    const { error } = await this.client.auth.updateUser({ password });
    if (error) throw error;
  }

  async completeOAuthProfile(): Promise<void> {
    if (!this.client) return;
    const { data, error } = await this.client.auth.getUser();
    if (error) throw error;
    const user = data.user;
    if (!user) throw new Error('Session OAuth introuvable.');
    const displayName = this.profileName({
      pseudo:
        this.metadataString(user.user_metadata, 'preferred_username') ??
        this.metadataString(user.user_metadata, 'user_name') ??
        this.metadataString(user.user_metadata, 'username'),
      displayName:
        this.metadataString(user.user_metadata, 'display_name') ??
        this.metadataString(user.user_metadata, 'displayName') ??
        this.metadataString(user.user_metadata, 'full_name') ??
        this.metadataString(user.user_metadata, 'fullName') ??
        this.metadataString(user.user_metadata, 'name'),
      email: user.email ?? '',
    });
    await this.updateProfileDisplayName(user.id, displayName);
    this.currentUser.set(
      this.mapUser({
        ...user,
        user_metadata: { ...user.user_metadata, display_name: displayName },
      }),
    );
  }

  private acceptSession(session: Session | null): void {
    this.currentUser.set(session?.user ? this.mapUser(session.user) : null);
    this.readyState.set(true);
  }

  private async updateProfileDisplayName(id: string, displayName: string): Promise<void> {
    if (!this.client) return;
    const { error } = await this.client
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', id);
    if (error) throw error;
  }

  private mapUser(user: User): AppUser {
    const metadata = user.user_metadata;
    return {
      id: user.id,
      email: user.email ?? '',
      displayName: this.profileName({
        pseudo:
          this.metadataString(metadata, 'pseudo') ?? this.metadataString(metadata, 'username'),
        displayName:
          this.metadataString(metadata, 'display_name') ??
          this.metadataString(metadata, 'displayName') ??
          this.metadataString(metadata, 'name') ??
          this.metadataString(metadata, 'full_name') ??
          this.metadataString(metadata, 'fullName'),
        firstName:
          this.metadataString(metadata, 'first_name') ?? this.metadataString(metadata, 'firstName'),
        email: user.email ?? '',
      }),
    };
  }

  private restoreDemoUser(): AppUser | null {
    if (isSupabaseConfigured) return null;
    try {
      const value = sessionStorage.getItem('odyssee_demo_user');
      if (!value) return null;
      const parsed = JSON.parse(value) as AppUser;
      return parsed.id && parsed.email
        ? {
            ...parsed,
            displayName: this.profileName({ displayName: parsed.displayName, email: parsed.email }),
          }
        : null;
    } catch {
      return null;
    }
  }

  private demoId(email: string): string {
    let hash = 2166136261;
    for (const char of email.toLowerCase()) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return `demo-${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }

  private metadataString(metadata: User['user_metadata'], key: string): string | null {
    const value = metadata[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private profileName(profile: {
    pseudo?: string | null;
    displayName?: string | null;
    firstName?: string | null;
    email?: string | null;
  }): string {
    const candidate =
      profile.pseudo?.trim() ||
      profile.displayName?.trim() ||
      profile.firstName?.trim() ||
      profile.email?.split('@')[0]?.trim();
    return candidate || 'Voyageur';
  }
}
