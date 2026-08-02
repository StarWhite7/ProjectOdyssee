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
});
