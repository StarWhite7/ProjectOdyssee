import { runtimeConfig } from './runtime-config';

describe('public runtime configuration', () => {
  it('contains only public Supabase connection fields', () => {
    expect(Object.keys(runtimeConfig).sort()).toEqual(['supabaseAnonKey', 'supabaseUrl']);
  });
});
