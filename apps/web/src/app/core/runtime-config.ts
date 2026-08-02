export type RuntimeConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  aiProvider: 'mock' | 'gemini';
};

declare global {
  interface Window {
    __ODYSSEE_CONFIG__?: Partial<RuntimeConfig>;
  }
}

const raw = window.__ODYSSEE_CONFIG__ ?? {};
export const runtimeConfig: RuntimeConfig = {
  supabaseUrl: raw.supabaseUrl?.trim() ?? '',
  supabaseAnonKey: raw.supabaseAnonKey?.trim() ?? '',
  aiProvider: raw.aiProvider === 'gemini' ? 'gemini' : 'mock',
};

export const isSupabaseConfigured = Boolean(
  runtimeConfig.supabaseUrl && runtimeConfig.supabaseAnonKey,
);
