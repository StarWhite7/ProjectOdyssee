import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const initial = readFileSync(
  resolve(process.cwd(), '../../supabase/migrations/202608020001_initial_schema.sql'),
  'utf8',
);
const secure = readFileSync(
  resolve(process.cwd(), '../../supabase/migrations/202608020002_secure_gameplay.sql'),
  'utf8',
);
const creation = readFileSync(
  resolve(process.cwd(), '../../supabase/migrations/202608020003_atomic_game_creation.sql'),
  'utf8',
);
const postgrest = readFileSync(
  resolve(process.cwd(), '../../supabase/migrations/202608020004_postgrest_permissions.sql'),
  'utf8',
);
const startGame = readFileSync(
  resolve(process.cwd(), '../../supabase/migrations/202608020006_start_game_when_ready.sql'),
  'utf8',
);
const mockResolution = readFileSync(
  resolve(
    process.cwd(),
    '../../supabase/migrations/202608030001_resolve_mock_turn_server_side.sql',
  ),
  'utf8',
);
describe('Supabase security migration', () => {
  it('enables RLS and protects private goals and decisions', () => {
    expect(initial.match(/enable row level security/g)?.length).toBeGreaterThanOrEqual(12);
    expect(initial).toContain("visibility='public' or public.owns_character(character_id)");
    expect(secure).toContain("resolution_status = 'resolved'");
  });
  it('enforces one decision and one turn number', () => {
    expect(initial).toContain('unique(turn_id,player_id)');
    expect(initial).toContain('unique(game_id,turn_number)');
  });
  it('uses atomic claim, completion and server timeout functions', () => {
    expect(secure).toContain('claim_turn_resolution');
    expect(secure).toContain('complete_turn_resolution');
    expect(secure).toContain('for update of turn skip locked');
  });
  it('backfills profiles and creates a game with its world atomically', () => {
    expect(creation).toContain('from auth.users');
    expect(creation).toContain('create function public.create_game');
    expect(creation).toContain('insert into public.world_states');
    expect(creation).toContain('extensions.gen_random_bytes');
  });
  it('grants the REST API least-privilege access and reloads its schema', () => {
    expect(postgrest).toContain('grant select on table');
    expect(postgrest).toContain('grant execute on function public.create_game');
    expect(postgrest).toContain("notify pgrst, 'reload schema'");
  });
  it('starts a ready game idempotently without an Edge Function', () => {
    expect(startGame).toContain('create function public.start_game_if_ready');
    expect(startGame).toContain("if target_game.status='active'");
    expect(startGame).toContain('on conflict(game_id,turn_number) do nothing');
  });
  it('counts secret decisions and resolves Mock turns only on the server', () => {
    expect(mockResolution).toContain('create function public.resolve_ready_turn_mock');
    expect(mockResolution).toContain('count(*) from public.player_decisions');
    expect(mockResolution).toContain("resolution_status='resolved'");
  });
});
