export type RuntimeConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
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
};

export const isSupabaseConfigured = Boolean(
  runtimeConfig.supabaseUrl && runtimeConfig.supabaseAnonKey,
);
