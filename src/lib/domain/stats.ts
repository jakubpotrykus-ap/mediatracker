import { monthKey } from "@/lib/domain/time";

export type StatsMedia = {
  id: string;
  format: "MOVIE" | "SERIES";
  category: "GENERAL" | "ANIME";
  title: string;
  genres: readonly string[];
};

export type StatsWatchEvent = {
  id: string;
  media: StatsMedia;
  durationMinutes: number;
  watchedAt: Date | null;
  dateUnknown: boolean;
  episodeCount?: number | null;
  kind: "MOVIE" | "SEASON";
};

export type StatsCycle = {
  mediaId: string;
  state: "ACTIVE" | "COMPLETED" | "CANCELLED";
};

export type AggregateStats = ReturnType<typeof calculateStats>;

function bucket(media: StatsMedia) {
  if (media.category === "ANIME") return "anime" as const;
  return media.format === "MOVIE" ? ("movies" as const) : ("series" as const);
}

function topMap(map: Map<string, number>, limit = 5) {
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function timeline(map: Map<string, number>) {
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));
}

export function calculateStats(
  events: readonly StatsWatchEvent[],
  cycles: readonly StatsCycle[],
) {
  const mediaById = new Map(events.map((event) => [event.media.id, event.media]));
  const totalMinutes = events.reduce((sum, event) => sum + event.durationMinutes, 0);
  const movieEvents = events.filter((event) => event.kind === "MOVIE");
  const seasonEvents = events.filter((event) => event.kind === "SEASON");
  const completedCycles = cycles.filter((cycle) => cycle.state === "COMPLETED");
  const monthly = new Map<string, number>();
  const yearly = new Map<string, number>();
  const timeByType = { movies: 0, series: 0, anime: 0 };
  const genreProductions = new Map<string, Set<string>>();
  const genreMinutes = new Map<string, number>();
  const mediaMinutes = new Map<string, number>();

  for (const event of events) {
    timeByType[bucket(event.media)] += event.durationMinutes;
    mediaMinutes.set(event.media.id, (mediaMinutes.get(event.media.id) ?? 0) + event.durationMinutes);
    if (event.watchedAt && !event.dateUnknown) {
      const key = monthKey(event.watchedAt);
      monthly.set(key, (monthly.get(key) ?? 0) + event.durationMinutes);
      const year = String(event.watchedAt.getUTCFullYear());
      yearly.set(year, (yearly.get(year) ?? 0) + event.durationMinutes);
    }
    for (const genre of event.media.genres) {
      const ids = genreProductions.get(genre) ?? new Set<string>();
      ids.add(event.media.id);
      genreProductions.set(genre, ids);
      genreMinutes.set(genre, (genreMinutes.get(genre) ?? 0) + event.durationMinutes);
    }
  }

  const unique = { movies: new Set<string>(), series: new Set<string>(), anime: new Set<string>() };
  for (const media of mediaById.values()) unique[bucket(media)].add(media.id);

  const movieCounts = new Map<string, number>();
  for (const event of movieEvents) movieCounts.set(event.media.id, (movieCounts.get(event.media.id) ?? 0) + 1);
  const cycleCounts = new Map<string, number>();
  for (const cycle of completedCycles) cycleCounts.set(cycle.mediaId, (cycleCounts.get(cycle.mediaId) ?? 0) + 1);
  const rewatches = [...movieCounts.values(), ...cycleCounts.values()].reduce(
    (sum, count) => sum + Math.max(0, count - 1),
    0,
  );

  return {
    totalMinutes,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    uniqueMovies: unique.movies.size,
    uniqueSeries: unique.series.size,
    uniqueAnime: unique.anime.size,
    fullMovieWatches: movieEvents.length,
    completedSeriesCycles: completedCycles.length,
    rewatches,
    watchedSeasons: seasonEvents.length,
    approximateEpisodes: seasonEvents.reduce((sum, event) => sum + (event.episodeCount ?? 0), 0),
    unknownDateMinutes: events
      .filter((event) => !event.watchedAt || event.dateUnknown)
      .reduce((sum, event) => sum + event.durationMinutes, 0),
    timeByType,
    monthly: timeline(monthly),
    yearly: timeline(yearly),
    genresByProductions: [...genreProductions.entries()]
      .map(([name, ids]) => ({ name, value: ids.size }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
      .slice(0, 5),
    genresByTime: topMap(genreMinutes),
    mostWatched: [...mediaMinutes.entries()]
      .map(([mediaId, value]) => ({ name: mediaById.get(mediaId)?.title ?? mediaId, value }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
      .slice(0, 5),
    mostRewatched: [...movieCounts.entries(), ...cycleCounts.entries()]
      .map(([mediaId, value]) => ({ name: mediaById.get(mediaId)?.title ?? mediaId, value }))
      .filter((item) => item.value > 1)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5),
  };
}
