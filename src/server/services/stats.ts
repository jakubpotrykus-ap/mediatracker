import "server-only";
import { calculateStats, type StatsWatchEvent } from "@/lib/domain/stats";
import { localizedTitle } from "@/lib/domain/title";
import { db } from "@/server/db";

export async function getUserStats(userId: string, locale: "pl" | "en" = "pl") {
  const [movies, seasons, cycles] = await Promise.all([
    db.movieWatchEvent.findMany({
      where: { userId },
      include: { media: { include: { genres: { include: { genre: true } } } } },
    }),
    db.seasonWatchEvent.findMany({
      where: { userId },
      include: { media: { include: { genres: { include: { genre: true } } } } },
    }),
    db.viewingCycle.findMany({ where: { userId }, select: { mediaId: true, state: true } }),
  ]);
  const events: StatsWatchEvent[] = [
    ...movies.map((event) => ({
      id: event.id,
      media: {
        id: event.media.id,
        format: event.media.format,
        category: event.media.category,
        title: localizedTitle(event.media, locale),
        genres: event.media.genres.map(({ genre }) => (locale === "pl" ? genre.namePl : genre.nameEn)),
      },
      durationMinutes: event.durationMinutesSnapshot,
      watchedAt: event.watchedAt,
      dateUnknown: event.watchedAtUnknown,
      kind: "MOVIE" as const,
    })),
    ...seasons.map((event) => ({
      id: event.id,
      media: {
        id: event.media.id,
        format: event.media.format,
        category: event.media.category,
        title: localizedTitle(event.media, locale),
        genres: event.media.genres.map(({ genre }) => (locale === "pl" ? genre.namePl : genre.nameEn)),
      },
      durationMinutes: event.durationMinutesSnapshot,
      watchedAt: event.watchedAt,
      dateUnknown: event.watchedAtUnknown,
      episodeCount: event.episodeCountSnapshot,
      kind: "SEASON" as const,
    })),
  ];
  return calculateStats(events, cycles);
}
