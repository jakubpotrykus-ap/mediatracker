import "server-only";
import {
  CatalogSource,
  DurationSource,
  LibraryStatus,
  MediaCategory,
  MediaFormat,
  type Prisma,
} from "@/generated/prisma/client";
import { slugify } from "@/lib/utils";
import { catalogDetails } from "@/server/catalog";
import type { CatalogMedia } from "@/server/catalog/types";
import { db } from "@/server/db";
import { appConfig } from "@/config";

export function metadataNeedsRefresh(lastSyncedAt: Date | null) {
  return !lastSyncedAt || Date.now() - lastSyncedAt.getTime() > appConfig.metadataStaleDays * 86_400_000;
}

function mediaData(media: CatalogMedia) {
  return {
    format: media.format,
    category: media.category,
    source: media.provider,
    titlePl: media.titlePl,
    titleEn: media.titleEn,
    titleOriginal: media.titleOriginal,
    descriptionPl: media.descriptionPl,
    descriptionEn: media.descriptionEn,
    releaseDate: media.releaseDate ? new Date(media.releaseDate) : null,
    releaseYear: media.releaseYear,
    posterUrl: media.posterUrl,
    backdropUrl: media.backdropUrl,
    runtimeMinutes: media.runtimeMinutes,
    runtimeSource: media.runtimeSource,
    averageEpisodeMinutes: media.averageEpisodeMinutes,
    adult: media.adult,
    lastSyncedAt: new Date(),
  };
}

async function syncRelations(tx: Prisma.TransactionClient, mediaId: string, media: CatalogMedia) {
  for (const name of media.genres.slice(0, 20)) {
    const slug = slugify(name);
    if (!slug) continue;
    const genre = await tx.genre.upsert({
      where: { slug },
      create: { slug, namePl: name.slice(0, 100), nameEn: name.slice(0, 100) },
      update: {},
    });
    await tx.mediaGenre.upsert({
      where: { mediaId_genreId: { mediaId, genreId: genre.id } },
      create: { mediaId, genreId: genre.id },
      update: {},
    });
  }
  for (const season of media.seasons) {
    await tx.season.upsert({
      where: { mediaId_number: { mediaId, number: season.number } },
      create: {
        mediaId,
        number: season.number,
        name: season.name,
        episodeCount: season.episodeCount,
        durationMinutes: season.durationMinutes,
        durationSource: season.durationSource,
        isSpecial: season.isSpecial,
        externalProvider: media.provider,
        externalId: season.externalId,
      },
      update: {
        name: season.name,
        episodeCount: season.episodeCount,
        durationMinutes: season.durationMinutes,
        durationSource: season.durationSource,
        isSpecial: season.isSpecial,
        externalId: season.externalId,
      },
    });
  }
}

export async function addCatalogMediaToLibrary(input: {
  userId: string;
  provider: CatalogSource;
  externalId: string;
  formatHint?: MediaFormat;
  status?: LibraryStatus;
}) {
  const catalogMedia = await catalogDetails(input.provider, input.externalId, input.formatHint);
  if (catalogMedia.adult) throw new Error("ADULT_CONTENT_HIDDEN");
  return db.$transaction(async (tx) => {
    const external = await tx.mediaExternalId.findUnique({
      where: { provider_externalId: { provider: input.provider, externalId: input.externalId } },
    });
    const media = external
      ? await tx.mediaItem.update({ where: { id: external.mediaId }, data: mediaData(catalogMedia) })
      : await tx.mediaItem.create({
          data: {
            ...mediaData(catalogMedia),
            externalIds: { create: { provider: input.provider, externalId: input.externalId } },
          },
        });
    await syncRelations(tx, media.id, catalogMedia);
    return tx.userMediaEntry.upsert({
      where: { userId_mediaId: { userId: input.userId, mediaId: media.id } },
      create: { userId: input.userId, mediaId: media.id, status: input.status ?? LibraryStatus.PLAN_TO_WATCH },
      update: { status: input.status ?? LibraryStatus.PLAN_TO_WATCH, lastActivityAt: new Date() },
      include: { media: { include: { seasons: true, genres: { include: { genre: true } } } } },
    });
  });
}

export type ManualMediaInput = {
  title: string;
  format: MediaFormat;
  category: MediaCategory;
  releaseYear?: number;
  genres: string[];
  runtimeMinutes?: number;
  seasons: Array<{ number: number; name?: string; episodeCount?: number; durationMinutes: number }>;
};

export async function addManualMediaToLibrary(userId: string, input: ManualMediaInput) {
  if (input.format === MediaFormat.MOVIE && !input.runtimeMinutes) throw new Error("DURATION_REQUIRED");
  if (input.format === MediaFormat.SERIES && input.seasons.length === 0) throw new Error("SEASONS_REQUIRED");
  return db.$transaction(async (tx) => {
    const media = await tx.mediaItem.create({
      data: {
        format: input.format,
        category: input.category,
        source: CatalogSource.MANUAL,
        manualOwnerId: userId,
        titleOriginal: input.title,
        titlePl: input.title,
        titleEn: input.title,
        releaseYear: input.releaseYear,
        runtimeMinutes: input.runtimeMinutes,
        runtimeSource: input.runtimeMinutes ? DurationSource.MANUAL : DurationSource.UNKNOWN,
        seasons: {
          create: input.seasons.map((season) => ({
            ...season,
            durationSource: DurationSource.MANUAL,
            isSpecial: season.number === 0,
          })),
        },
      },
    });
    for (const name of input.genres.slice(0, 20)) {
      const slug = slugify(name);
      if (!slug) continue;
      const genre = await tx.genre.upsert({
        where: { slug },
        create: { slug, namePl: name.slice(0, 100), nameEn: name.slice(0, 100) },
        update: {},
      });
      await tx.mediaGenre.create({ data: { mediaId: media.id, genreId: genre.id } });
    }
    return tx.userMediaEntry.create({
      data: { userId, mediaId: media.id },
      include: { media: { include: { seasons: true, genres: { include: { genre: true } } } } },
    });
  });
}

export async function refreshMediaMetadata(userId: string, entryId: string) {
  const entry = await db.userMediaEntry.findFirst({
    where: { id: entryId, userId },
    include: { media: { include: { externalIds: true } } },
  });
  if (!entry) throw new Error("NOT_FOUND");
  const external = entry.media.externalIds.find((item) => item.provider !== CatalogSource.MANUAL);
  if (!external) throw new Error("MANUAL_MEDIA_NOT_SYNCABLE");
  const latest = await catalogDetails(external.provider, external.externalId, entry.media.format);
  await db.$transaction(async (tx) => {
    await tx.mediaItem.update({ where: { id: entry.mediaId }, data: mediaData(latest) });
    await syncRelations(tx, entry.mediaId, latest);
  });
}
