import "server-only";
import { CycleState, DurationSource, LibraryStatus, MediaFormat } from "@/generated/prisma/enums";
import { createCycleSnapshot } from "@/lib/domain/cycles";
import { db } from "@/server/db";

async function ownedEntry(userId: string, entryId: string) {
  const entry = await db.userMediaEntry.findFirst({
    where: { id: entryId, userId },
    include: {
      media: {
        include: {
          seasons: {
            orderBy: { number: "asc" },
            include: { userDurationOverrides: { where: { userId }, select: { durationMinutes: true } } },
          },
        },
      },
    },
  });
  if (!entry) throw new Error("NOT_FOUND");
  return entry;
}

function seasonsForUser(seasons: Awaited<ReturnType<typeof ownedEntry>>["media"]["seasons"]) {
  return seasons.map((season) => {
    const override = season.userDurationOverrides[0];
    return {
      ...season,
      durationMinutes: override?.durationMinutes ?? season.durationMinutes,
      durationSource: override ? DurationSource.MANUAL : season.durationSource,
    };
  });
}

export async function addMovieWatches(
  userId: string,
  entryId: string,
  input: { count: number; watchedDates?: Array<string | null> },
) {
  const entry = await ownedEntry(userId, entryId);
  if (entry.media.format !== MediaFormat.MOVIE) throw new Error("NOT_A_MOVIE");
  if (!entry.media.runtimeMinutes) throw new Error("DURATION_REQUIRED");
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > 50) throw new Error("INVALID_COUNT");
  const events = Array.from({ length: input.count }, (_, index) => {
    const rawDate = input.watchedDates?.[index];
    return {
      userId,
      mediaId: entry.mediaId,
      watchedAt: rawDate ? new Date(rawDate) : null,
      watchedAtUnknown: !rawDate,
      durationMinutesSnapshot: entry.media.runtimeMinutes!,
      durationSourceSnapshot: entry.media.runtimeSource,
    };
  });
  await db.$transaction([
    db.movieWatchEvent.createMany({ data: events }),
    db.userMediaEntry.update({
      where: { id: entryId },
      data: { status: LibraryStatus.COMPLETED, lastActivityAt: new Date() },
    }),
  ]);
}

export async function removeMovieWatch(userId: string, eventId: string) {
  const event = await db.movieWatchEvent.findFirst({ where: { id: eventId, userId }, select: { id: true } });
  if (!event) throw new Error("NOT_FOUND");
  await db.movieWatchEvent.delete({ where: { id: eventId } });
}

export async function startCycle(userId: string, entryId: string, includeSpecials = false) {
  const entry = await ownedEntry(userId, entryId);
  if (entry.media.format !== MediaFormat.SERIES) throw new Error("NOT_A_SERIES");
  const snapshots = createCycleSnapshot(seasonsForUser(entry.media.seasons), includeSpecials);
  if (snapshots.length === 0) throw new Error("SEASONS_REQUIRED");
  return db.$transaction(async (tx) => {
    const last = await tx.viewingCycle.findFirst({
      where: { userId, mediaId: entry.mediaId },
      orderBy: { cycleNumber: "desc" },
      select: { cycleNumber: true },
    });
    return tx.viewingCycle.create({
      data: {
        userId,
        mediaId: entry.mediaId,
        cycleNumber: (last?.cycleNumber ?? 0) + 1,
        startedAt: new Date(),
        seasons: { create: snapshots },
      },
      include: { seasons: true },
    });
  });
}

export async function cancelCycle(userId: string, entryId: string, cycleId: string) {
  const entry = await ownedEntry(userId, entryId);
  const result = await db.viewingCycle.updateMany({
    where: { id: cycleId, userId, mediaId: entry.mediaId, state: CycleState.ACTIVE },
    data: { state: CycleState.CANCELLED },
  });
  if (result.count !== 1) throw new Error("NOT_FOUND");
  await db.userMediaEntry.update({ where: { id: entryId }, data: { lastActivityAt: new Date() } });
}

export async function markSeasonWatched(
  userId: string,
  entryId: string,
  input: { seasonId: string; cycleId?: string; standalone?: boolean; watchedAt?: string | null },
) {
  const entry = await ownedEntry(userId, entryId);
  const season = entry.media.seasons.find((candidate) => candidate.id === input.seasonId);
  if (!season) throw new Error("NOT_FOUND");
  const durationOverride = season.userDurationOverrides[0];
  const durationMinutes = durationOverride?.durationMinutes ?? season.durationMinutes;
  const durationSource = durationOverride ? DurationSource.MANUAL : season.durationSource;
  if (!durationMinutes) throw new Error("DURATION_REQUIRED");
  let cycleId = input.standalone ? undefined : input.cycleId;
  if (!cycleId && !input.standalone) {
    const active = await db.viewingCycle.findFirst({ where: { userId, mediaId: entry.mediaId, state: CycleState.ACTIVE } });
    cycleId = active?.id ?? (await startCycle(userId, entryId)).id;
  }
  return db.$transaction(async (tx) => {
    const cycleSeason = cycleId
      ? await tx.viewingCycleSeason.findFirst({
          where: { cycleId, seasonNumberSnapshot: season.number, cycle: { userId, mediaId: entry.mediaId, state: CycleState.ACTIVE } },
          include: { watchEvent: true },
        })
      : null;
    if (cycleId && !cycleSeason) throw new Error("INVALID_CYCLE");
    if (cycleSeason?.watchEvent) throw new Error("ALREADY_WATCHED");
    const watch = await tx.seasonWatchEvent.create({
      data: {
        userId,
        mediaId: entry.mediaId,
        seasonId: season.id,
        cycleId,
        cycleSeasonId: cycleSeason?.id,
        watchedAt: input.watchedAt ? new Date(input.watchedAt) : null,
        watchedAtUnknown: !input.watchedAt,
        seasonNumberSnapshot: season.number,
        seasonNameSnapshot: season.name,
        episodeCountSnapshot: season.episodeCount,
        durationMinutesSnapshot: durationMinutes,
        durationSourceSnapshot: durationSource,
      },
    });
    if (cycleId) {
      const required = await tx.viewingCycleSeason.count({ where: { cycleId, required: true } });
      const completed = await tx.seasonWatchEvent.count({ where: { cycleId, cycleSeason: { required: true } } });
      if (required > 0 && completed === required) {
        await tx.viewingCycle.update({
          where: { id: cycleId },
          data: {
            state: CycleState.COMPLETED,
            completedAt: input.watchedAt ? new Date(input.watchedAt) : null,
            completedAtUnknown: !input.watchedAt,
          },
        });
        await tx.userMediaEntry.update({ where: { id: entryId }, data: { status: LibraryStatus.COMPLETED, lastActivityAt: new Date() } });
      } else {
        await tx.userMediaEntry.update({ where: { id: entryId }, data: { status: LibraryStatus.WATCHING, lastActivityAt: new Date() } });
      }
    }
    return watch;
  });
}

export async function undoSeasonWatch(userId: string, eventId: string) {
  const event = await db.seasonWatchEvent.findFirst({ where: { id: eventId, userId } });
  if (!event) throw new Error("NOT_FOUND");
  await db.$transaction(async (tx) => {
    await tx.seasonWatchEvent.delete({ where: { id: eventId } });
    if (event.cycleId) {
      await tx.viewingCycle.update({
        where: { id: event.cycleId },
        data: { state: CycleState.ACTIVE, completedAt: null, completedAtUnknown: false },
      });
      await tx.userMediaEntry.updateMany({
        where: { userId, mediaId: event.mediaId },
        data: { status: LibraryStatus.WATCHING, lastActivityAt: new Date() },
      });
    }
  });
}

export async function addCompletedCycles(userId: string, entryId: string, count: number) {
  const entry = await ownedEntry(userId, entryId);
  if (entry.media.format !== MediaFormat.SERIES || !Number.isInteger(count) || count < 1 || count > 20) throw new Error("INVALID_COUNT");
  const snapshots = createCycleSnapshot(seasonsForUser(entry.media.seasons));
  if (snapshots.some((season) => !season.durationMinutesSnapshot)) throw new Error("DURATION_REQUIRED");
  await db.$transaction(async (tx) => {
    const last = await tx.viewingCycle.findFirst({
      where: { userId, mediaId: entry.mediaId },
      orderBy: { cycleNumber: "desc" },
      select: { cycleNumber: true },
    });
    for (let offset = 1; offset <= count; offset += 1) {
      const cycle = await tx.viewingCycle.create({
        data: {
          userId,
          mediaId: entry.mediaId,
          cycleNumber: (last?.cycleNumber ?? 0) + offset,
          state: CycleState.COMPLETED,
          startedAtUnknown: true,
          completedAtUnknown: true,
          seasons: { create: snapshots },
        },
        include: { seasons: true },
      });
      for (const cycleSeason of cycle.seasons.filter((item) => item.required)) {
        await tx.seasonWatchEvent.create({
          data: {
            userId,
            mediaId: entry.mediaId,
            seasonId: cycleSeason.seasonId,
            cycleId: cycle.id,
            cycleSeasonId: cycleSeason.id,
            watchedAtUnknown: true,
            seasonNumberSnapshot: cycleSeason.seasonNumberSnapshot,
            seasonNameSnapshot: cycleSeason.seasonNameSnapshot,
            episodeCountSnapshot: cycleSeason.episodeCountSnapshot,
            durationMinutesSnapshot: cycleSeason.durationMinutesSnapshot!,
            durationSourceSnapshot: cycleSeason.durationSourceSnapshot,
          },
        });
      }
    }
    await tx.userMediaEntry.update({ where: { id: entryId }, data: { status: LibraryStatus.COMPLETED, lastActivityAt: new Date() } });
  });
}

export async function setSeasonDuration(userId: string, entryId: string, seasonId: string, durationMinutes: number) {
  const entry = await ownedEntry(userId, entryId);
  if (!entry.media.seasons.some((season) => season.id === seasonId)) throw new Error("NOT_FOUND");
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 100_000) throw new Error("INVALID_DURATION");
  await db.userSeasonDurationOverride.upsert({
    where: { userId_seasonId: { userId, seasonId } },
    create: { userId, seasonId, durationMinutes },
    update: { durationMinutes },
  });
}
