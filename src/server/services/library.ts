import "server-only";
import { LibraryStatus, MediaCategory, MediaFormat } from "@/generated/prisma/enums";
import { slugify } from "@/lib/utils";
import { db } from "@/server/db";

export type LibraryFilters = {
  query?: string;
  status?: LibraryStatus;
  labelId?: string;
  type?: "ALL" | "MOVIE" | "SERIES" | "ANIME";
  genre?: string;
  yearFrom?: number;
  yearTo?: number;
  minWatches?: number;
  activitySince?: Date;
  sort?: "activity" | "added" | "title";
};

export async function getLibrary(userId: string, filters: LibraryFilters = {}) {
  const entries = await db.userMediaEntry.findMany({
    where: {
      userId,
      status: filters.status,
      lastActivityAt: filters.activitySince ? { gte: filters.activitySince } : undefined,
      labels: filters.labelId ? { some: { labelId: filters.labelId } } : undefined,
      media: {
        category: filters.type === "ANIME" ? MediaCategory.ANIME : filters.type && filters.type !== "ALL" ? MediaCategory.GENERAL : undefined,
        format:
          filters.type === "MOVIE" ? MediaFormat.MOVIE : filters.type === "SERIES" ? MediaFormat.SERIES : undefined,
        releaseYear: filters.yearFrom || filters.yearTo ? { gte: filters.yearFrom, lte: filters.yearTo } : undefined,
        genres: filters.genre ? { some: { genre: { slug: slugify(filters.genre) } } } : undefined,
        OR: filters.query
          ? [
              { titlePl: { contains: filters.query, mode: "insensitive" } },
              { titleEn: { contains: filters.query, mode: "insensitive" } },
              { titleOriginal: { contains: filters.query, mode: "insensitive" } },
            ]
          : undefined,
      },
    },
    include: {
      media: {
        include: {
          genres: { include: { genre: true } },
          seasons: { orderBy: { number: "asc" } },
          movieWatchEvents: { where: { userId }, select: { id: true } },
          seasonWatchEvents: { where: { userId }, select: { id: true } },
          viewingCycles: { where: { userId, state: "COMPLETED" }, select: { id: true } },
        },
      },
      labels: { include: { label: true } },
    },
    orderBy:
      filters.sort === "added"
        ? { addedAt: "desc" }
        : filters.sort === "title"
          ? { media: { titleOriginal: "asc" } }
          : { lastActivityAt: "desc" },
  });
  if (!filters.minWatches) return entries;
  return entries.filter((entry) => {
    const watches = entry.media.format === MediaFormat.MOVIE ? entry.media.movieWatchEvents.length : entry.media.viewingCycles.length;
    return watches >= filters.minWatches!;
  });
}

export async function getLibraryEntry(userId: string, entryId: string) {
  const entry = await db.userMediaEntry.findFirst({
    where: { id: entryId, userId },
    include: {
      media: {
        include: {
          genres: { include: { genre: true } },
          seasons: {
            orderBy: { number: "asc" },
            include: { userDurationOverrides: { where: { userId }, select: { durationMinutes: true } } },
          },
          movieWatchEvents: { where: { userId }, orderBy: { recordedAt: "desc" } },
          seasonWatchEvents: { where: { userId }, orderBy: { recordedAt: "desc" } },
          viewingCycles: {
            where: { userId },
            include: { seasons: { include: { watchEvent: true }, orderBy: { seasonNumberSnapshot: "asc" } } },
            orderBy: { cycleNumber: "desc" },
          },
          externalIds: true,
        },
      },
      labels: { include: { label: true } },
    },
  });
  if (!entry) throw new Error("NOT_FOUND");
  return entry;
}

export async function updateLibraryEntry(userId: string, entryId: string, data: { status?: LibraryStatus; labelIds?: string[] }) {
  const entry = await db.userMediaEntry.findFirst({ where: { id: entryId, userId }, select: { id: true } });
  if (!entry) throw new Error("NOT_FOUND");
  if (data.labelIds) {
    const count = await db.customLabel.count({ where: { userId, id: { in: data.labelIds } } });
    if (count !== new Set(data.labelIds).size) throw new Error("INVALID_LABEL");
  }
  return db.$transaction(async (tx) => {
    if (data.labelIds) {
      await tx.userMediaLabel.deleteMany({ where: { entryId } });
      await tx.userMediaLabel.createMany({ data: data.labelIds.map((labelId) => ({ entryId, labelId })) });
    }
    return tx.userMediaEntry.update({
      where: { id: entryId },
      data: { status: data.status, lastActivityAt: new Date() },
    });
  });
}

export async function removeLibraryEntry(userId: string, entryId: string) {
  const entry = await db.userMediaEntry.findFirst({ where: { id: entryId, userId }, include: { media: true } });
  if (!entry) throw new Error("NOT_FOUND");
  await db.$transaction(async (tx) => {
    await tx.userMediaEntry.delete({ where: { id: entryId } });
    if (entry.media.manualOwnerId === userId) await tx.mediaItem.delete({ where: { id: entry.mediaId } });
  });
}
