import type { Memory } from './models.js';

export type MemoryQuery = {
  characterIds: string[];
  location?: string | null;
  goalTerms?: string[];
  now?: Date;
  limit?: number;
};
export interface MemorySearch {
  select(memories: Memory[], query: MemoryQuery): Memory[];
}
export class DeterministicMemorySearch implements MemorySearch {
  select(memories: Memory[], query: MemoryQuery): Memory[] {
    const now = query.now?.getTime() ?? Date.now();
    const terms = [query.location ?? '', ...(query.goalTerms ?? [])]
      .map((x) => x.toLocaleLowerCase())
      .filter(Boolean);
    return [...memories]
      .sort(
        (a, b) =>
          this.score(b, now, query.characterIds, terms) -
            this.score(a, now, query.characterIds, terms) || a.id.localeCompare(b.id),
      )
      .slice(0, query.limit ?? 12);
  }
  private score(memory: Memory, now: number, characterIds: string[], terms: string[]): number {
    const ageDays = Math.max(0, (now - Date.parse(memory.createdAt)) / 86_400_000);
    const involved = memory.involvedEntityIds.some((id) => characterIds.includes(id)) ? 20 : 0;
    const haystack = `${memory.title} ${memory.summary}`.toLocaleLowerCase();
    const matches = terms.filter((term) => haystack.includes(term)).length * 8;
    return memory.importance * 10 + involved + matches + Math.max(0, 10 - ageDays / 7);
  }
}
