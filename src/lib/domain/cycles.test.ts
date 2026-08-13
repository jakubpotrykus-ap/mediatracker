import { describe, expect, it } from "vitest";
import { createCycleSnapshot, isCycleComplete, type SeasonDefinition } from "@/lib/domain/cycles";

const seasons: SeasonDefinition[] = [
  { id: "special", number: 0, durationMinutes: 50, durationSource: "EXACT", isSpecial: true },
  { id: "one", number: 1, durationMinutes: 600, durationSource: "EXACT" },
  { id: "two", number: 2, durationMinutes: 500, durationSource: "EXACT" },
];

describe("cycle snapshots", () => {
  it("does not require specials by default", () => {
    const snapshot = createCycleSnapshot(seasons);
    expect(snapshot.map((season) => season.seasonNumberSnapshot)).toEqual([1, 2]);
    expect(isCycleComplete(snapshot, new Set([1, 2]))).toBe(true);
  });

  it("does not mutate old cycles when a new season appears", () => {
    const oldSnapshot = createCycleSnapshot(seasons);
    const catalogNow = [
      ...seasons,
      { id: "three", number: 3, durationMinutes: 400, durationSource: "EXACT" as const },
    ];
    const newSnapshot = createCycleSnapshot(catalogNow);
    expect(oldSnapshot).toHaveLength(2);
    expect(newSnapshot.map((season) => season.seasonNumberSnapshot)).toEqual([1, 2, 3]);
  });
});
