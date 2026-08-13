import { describe, expect, it } from "vitest";
import { calculateStats, type StatsWatchEvent } from "@/lib/domain/stats";

const movie = { id: "movie", format: "MOVIE", category: "GENERAL", title: "Film", genres: ["Drama"] } as const;
const series = { id: "series", format: "SERIES", category: "GENERAL", title: "Serial", genres: ["Drama"] } as const;

function event(overrides: Partial<StatsWatchEvent> = {}): StatsWatchEvent {
  return {
    id: crypto.randomUUID(),
    media: movie,
    durationMinutes: 100,
    watchedAt: new Date("2026-03-10T12:00:00Z"),
    dateUnknown: false,
    kind: "MOVIE",
    ...overrides,
  };
}

describe("movie statistics", () => {
  it("counts one watch and its duration", () => {
    const stats = calculateStats([event()], []);
    expect(stats.fullMovieWatches).toBe(1);
    expect(stats.totalMinutes).toBe(100);
  });

  it("sums multiple immutable watch events", () => {
    const stats = calculateStats([event(), event(), event()], []);
    expect(stats.fullMovieWatches).toBe(3);
    expect(stats.totalMinutes).toBe(300);
    expect(stats.rewatches).toBe(2);
  });

  it("keeps unknown dates out of monthly buckets", () => {
    const stats = calculateStats([event({ watchedAt: null, dateUnknown: true })], []);
    expect(stats.monthly).toEqual([]);
    expect(stats.unknownDateMinutes).toBe(100);
  });

  it("recalculates after an erroneous event is removed", () => {
    const events = [event(), event()];
    expect(calculateStats(events, []).totalMinutes).toBe(200);
    expect(calculateStats(events.slice(0, 1), []).totalMinutes).toBe(100);
  });
});

describe("series cycles", () => {
  const season = (id: string, minutes: number, cycle: number): StatsWatchEvent =>
    event({
      id: `${cycle}-${id}`,
      media: series,
      durationMinutes: minutes,
      kind: "SEASON",
      episodeCount: 10,
    });

  it("counts complete cycles without double-counting their time", () => {
    const first = [season("s1", 600, 1), season("s2", 500, 1)];
    let stats = calculateStats(first, [{ mediaId: series.id, state: "COMPLETED" }]);
    expect(stats.completedSeriesCycles).toBe(1);
    expect(stats.totalMinutes).toBe(1100);

    const partialSecond = [...first, season("s1", 600, 2)];
    stats = calculateStats(partialSecond, [
      { mediaId: series.id, state: "COMPLETED" },
      { mediaId: series.id, state: "ACTIVE" },
    ]);
    expect(stats.completedSeriesCycles).toBe(1);
    expect(stats.totalMinutes).toBe(1700);

    stats = calculateStats([...partialSecond, season("s2", 500, 2)], [
      { mediaId: series.id, state: "COMPLETED" },
      { mediaId: series.id, state: "COMPLETED" },
    ]);
    expect(stats.completedSeriesCycles).toBe(2);
    expect(stats.totalMinutes).toBe(2200);
  });

  it("adds a standalone season to time but not completed cycles", () => {
    const stats = calculateStats([season("standalone", 600, 0)], []);
    expect(stats.totalMinutes).toBe(600);
    expect(stats.completedSeriesCycles).toBe(0);
  });

  it("preserves historical duration snapshots", () => {
    const oldEvent = season("s1-old", 600, 1);
    const newEvent = season("s1-new", 650, 2);
    expect(calculateStats([oldEvent, newEvent], []).totalMinutes).toBe(1250);
  });
});
