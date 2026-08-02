import { computed, Injectable, signal } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
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
    if (this.client) {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      if (error) throw error;
      if (data.session) this.acceptSession(data.session);
      return data.session
        ? 'Compte créé. Vous êtes connecté.'
        : 'Compte créé. Consultez votre email pour confirmer l’inscription.';
    }
    const user = {
      id: this.demoId(email),
      email,
      displayName: displayName || email.split('@')[0]!,
    };
    sessionStorage.setItem('odyssee_demo_user', JSON.stringify(user));
    this.currentUser.set(user);
    return 'Session de démonstration créée.';
  }

  async signIn(email: string, password: string): Promise<void> {
    if (this.client) {
      const { data, error } = await this.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      this.acceptSession(data.session);
      return;
    }
    const user = { id: this.demoId(email), email, displayName: email.split('@')[0]! };
    sessionStorage.setItem('odyssee_demo_user', JSON.stringify(user));
    this.currentUser.set(user);
  }

  async signOut(): Promise<void> {
    if (this.client) await this.client.auth.signOut();
    sessionStorage.removeItem('odyssee_demo_user');
    this.currentUser.set(null);
  }

  async resetPassword(email: string): Promise<void> {
    if (!this.client) return;
    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/connexion`,
    });
    if (error) throw error;
  }

  private acceptSession(session: Session | null): void {
    this.currentUser.set(session?.user ? this.mapUser(session.user) : null);
    this.readyState.set(true);
  }

  private mapUser(user: User): AppUser {
    return {
      id: user.id,
      email: user.email ?? '',
      displayName: String(
        user.user_metadata['display_name'] ?? user.email?.split('@')[0] ?? 'Voyageur',
      ),
    };
  }

  private restoreDemoUser(): AppUser | null {
    if (isSupabaseConfigured) return null;
    try {
      const value = sessionStorage.getItem('odyssee_demo_user');
      if (!value) return null;
      const parsed = JSON.parse(value) as AppUser;
      return parsed.id && parsed.email ? parsed : null;
    } catch {
      return null;
    }
  }

  private demoId(email: string): string {
    let hash = 2166136261;
    for (const char of email.toLowerCase()) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return `demo-${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }
}
