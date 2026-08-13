-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AppLocale" AS ENUM ('PL', 'EN');

-- CreateEnum
CREATE TYPE "MediaFormat" AS ENUM ('MOVIE', 'SERIES');

-- CreateEnum
CREATE TYPE "MediaCategory" AS ENUM ('GENERAL', 'ANIME');

-- CreateEnum
CREATE TYPE "CatalogSource" AS ENUM ('TMDB', 'ANILIST', 'MANUAL', 'TEST');

-- CreateEnum
CREATE TYPE "DurationSource" AS ENUM ('EXACT', 'ESTIMATED', 'MANUAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "LibraryStatus" AS ENUM ('PLAN_TO_WATCH', 'WATCHING', 'COMPLETED', 'ON_HOLD', 'DROPPED', 'REWATCHING');

-- CreateEnum
CREATE TYPE "CycleState" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(32) NOT NULL,
    "usernameNormalized" VARCHAR(32) NOT NULL,
    "email" VARCHAR(254),
    "emailNormalized" VARCHAR(254),
    "passwordHash" VARCHAR(255) NOT NULL,
    "passwordVersion" INTEGER NOT NULL DEFAULT 1,
    "displayName" VARCHAR(80),
    "bio" VARCHAR(280),
    "image" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "userId" TEXT NOT NULL,
    "locale" "AppLocale" NOT NULL DEFAULT 'PL',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Europe/Warsaw',
    "profilePublic" BOOLEAN NOT NULL DEFAULT false,
    "showStats" BOOLEAN NOT NULL DEFAULT true,
    "showLibrary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "media_items" (
    "id" TEXT NOT NULL,
    "format" "MediaFormat" NOT NULL,
    "category" "MediaCategory" NOT NULL DEFAULT 'GENERAL',
    "source" "CatalogSource" NOT NULL,
    "manualOwnerId" TEXT,
    "titlePl" VARCHAR(300),
    "titleEn" VARCHAR(300),
    "titleOriginal" VARCHAR(300) NOT NULL,
    "descriptionPl" TEXT,
    "descriptionEn" TEXT,
    "releaseDate" TIMESTAMP(3),
    "releaseYear" INTEGER,
    "posterUrl" VARCHAR(500),
    "backdropUrl" VARCHAR(500),
    "runtimeMinutes" INTEGER,
    "runtimeSource" "DurationSource" NOT NULL DEFAULT 'UNKNOWN',
    "averageEpisodeMinutes" INTEGER,
    "adult" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_external_ids" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "provider" "CatalogSource" NOT NULL,
    "externalId" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_external_ids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genres" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "namePl" VARCHAR(100) NOT NULL,
    "nameEn" VARCHAR(100) NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_genres" (
    "mediaId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,

    CONSTRAINT "media_genres_pkey" PRIMARY KEY ("mediaId","genreId")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" VARCHAR(200),
    "episodeCount" INTEGER,
    "durationMinutes" INTEGER,
    "durationSource" "DurationSource" NOT NULL DEFAULT 'UNKNOWN',
    "isSpecial" BOOLEAN NOT NULL DEFAULT false,
    "externalProvider" "CatalogSource",
    "externalId" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_season_duration_overrides" (
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_season_duration_overrides_pkey" PRIMARY KEY ("userId","seasonId")
);

-- CreateTable
CREATE TABLE "user_media_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "status" "LibraryStatus" NOT NULL DEFAULT 'PLAN_TO_WATCH',
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_media_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movie_watch_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "watchedAt" TIMESTAMP(3),
    "watchedAtUnknown" BOOLEAN NOT NULL DEFAULT false,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMinutesSnapshot" INTEGER NOT NULL,
    "durationSourceSnapshot" "DurationSource" NOT NULL,

    CONSTRAINT "movie_watch_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viewing_cycles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "state" "CycleState" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3),
    "startedAtUnknown" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedAtUnknown" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "viewing_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viewing_cycle_seasons" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "seasonId" TEXT,
    "seasonNumberSnapshot" INTEGER NOT NULL,
    "seasonNameSnapshot" VARCHAR(200),
    "required" BOOLEAN NOT NULL DEFAULT true,
    "episodeCountSnapshot" INTEGER,
    "durationMinutesSnapshot" INTEGER,
    "durationSourceSnapshot" "DurationSource" NOT NULL,

    CONSTRAINT "viewing_cycle_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_watch_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "seasonId" TEXT,
    "cycleId" TEXT,
    "cycleSeasonId" TEXT,
    "watchedAt" TIMESTAMP(3),
    "watchedAtUnknown" BOOLEAN NOT NULL DEFAULT false,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seasonNumberSnapshot" INTEGER NOT NULL,
    "seasonNameSnapshot" VARCHAR(200),
    "episodeCountSnapshot" INTEGER,
    "durationMinutesSnapshot" INTEGER NOT NULL,
    "durationSourceSnapshot" "DurationSource" NOT NULL,

    CONSTRAINT "season_watch_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_labels" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "color" VARCHAR(20),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_media_labels" (
    "entryId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,

    CONSTRAINT "user_media_labels_pkey" PRIMARY KEY ("entryId","labelId")
);

-- CreateTable
CREATE TABLE "catalog_cache" (
    "key" VARCHAR(255) NOT NULL,
    "value" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_cache_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "rate_limit_buckets" (
    "key" VARCHAR(128) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_usernameNormalized_key" ON "users"("usernameNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "users_emailNormalized_key" ON "users"("emailNormalized");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "media_items_format_category_releaseYear_idx" ON "media_items"("format", "category", "releaseYear");

-- CreateIndex
CREATE INDEX "media_items_manualOwnerId_idx" ON "media_items"("manualOwnerId");

-- CreateIndex
CREATE INDEX "media_items_lastSyncedAt_idx" ON "media_items"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "media_external_ids_mediaId_idx" ON "media_external_ids"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "media_external_ids_provider_externalId_key" ON "media_external_ids"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "genres_slug_key" ON "genres"("slug");

-- CreateIndex
CREATE INDEX "media_genres_genreId_mediaId_idx" ON "media_genres"("genreId", "mediaId");

-- CreateIndex
CREATE INDEX "seasons_mediaId_isSpecial_idx" ON "seasons"("mediaId", "isSpecial");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_mediaId_number_key" ON "seasons"("mediaId", "number");

-- CreateIndex
CREATE INDEX "user_season_duration_overrides_seasonId_idx" ON "user_season_duration_overrides"("seasonId");

-- CreateIndex
CREATE INDEX "user_media_entries_userId_status_lastActivityAt_idx" ON "user_media_entries"("userId", "status", "lastActivityAt");

-- CreateIndex
CREATE INDEX "user_media_entries_userId_addedAt_idx" ON "user_media_entries"("userId", "addedAt");

-- CreateIndex
CREATE INDEX "user_media_entries_mediaId_idx" ON "user_media_entries"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "user_media_entries_userId_mediaId_key" ON "user_media_entries"("userId", "mediaId");

-- CreateIndex
CREATE INDEX "movie_watch_events_userId_watchedAt_idx" ON "movie_watch_events"("userId", "watchedAt");

-- CreateIndex
CREATE INDEX "movie_watch_events_userId_mediaId_recordedAt_idx" ON "movie_watch_events"("userId", "mediaId", "recordedAt");

-- CreateIndex
CREATE INDEX "viewing_cycles_userId_state_updatedAt_idx" ON "viewing_cycles"("userId", "state", "updatedAt");

-- CreateIndex
CREATE INDEX "viewing_cycles_mediaId_idx" ON "viewing_cycles"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "viewing_cycles_userId_mediaId_cycleNumber_key" ON "viewing_cycles"("userId", "mediaId", "cycleNumber");

-- CreateIndex
CREATE INDEX "viewing_cycle_seasons_seasonId_idx" ON "viewing_cycle_seasons"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "viewing_cycle_seasons_cycleId_seasonNumberSnapshot_key" ON "viewing_cycle_seasons"("cycleId", "seasonNumberSnapshot");

-- CreateIndex
CREATE UNIQUE INDEX "season_watch_events_cycleSeasonId_key" ON "season_watch_events"("cycleSeasonId");

-- CreateIndex
CREATE INDEX "season_watch_events_userId_watchedAt_idx" ON "season_watch_events"("userId", "watchedAt");

-- CreateIndex
CREATE INDEX "season_watch_events_userId_mediaId_recordedAt_idx" ON "season_watch_events"("userId", "mediaId", "recordedAt");

-- CreateIndex
CREATE INDEX "season_watch_events_cycleId_idx" ON "season_watch_events"("cycleId");

-- CreateIndex
CREATE INDEX "custom_labels_userId_sortOrder_idx" ON "custom_labels"("userId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "custom_labels_userId_name_key" ON "custom_labels"("userId", "name");

-- CreateIndex
CREATE INDEX "user_media_labels_labelId_entryId_idx" ON "user_media_labels"("labelId", "entryId");

-- CreateIndex
CREATE INDEX "catalog_cache_expiresAt_idx" ON "catalog_cache"("expiresAt");

-- CreateIndex
CREATE INDEX "rate_limit_buckets_windowStart_idx" ON "rate_limit_buckets"("windowStart");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_items" ADD CONSTRAINT "media_items_manualOwnerId_fkey" FOREIGN KEY ("manualOwnerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_external_ids" ADD CONSTRAINT "media_external_ids_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_genres" ADD CONSTRAINT "media_genres_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_genres" ADD CONSTRAINT "media_genres_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_season_duration_overrides" ADD CONSTRAINT "user_season_duration_overrides_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_season_duration_overrides" ADD CONSTRAINT "user_season_duration_overrides_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_media_entries" ADD CONSTRAINT "user_media_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_media_entries" ADD CONSTRAINT "user_media_entries_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movie_watch_events" ADD CONSTRAINT "movie_watch_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movie_watch_events" ADD CONSTRAINT "movie_watch_events_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_cycles" ADD CONSTRAINT "viewing_cycles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_cycles" ADD CONSTRAINT "viewing_cycles_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_cycle_seasons" ADD CONSTRAINT "viewing_cycle_seasons_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "viewing_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_cycle_seasons" ADD CONSTRAINT "viewing_cycle_seasons_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_watch_events" ADD CONSTRAINT "season_watch_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_watch_events" ADD CONSTRAINT "season_watch_events_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_watch_events" ADD CONSTRAINT "season_watch_events_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_watch_events" ADD CONSTRAINT "season_watch_events_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "viewing_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_watch_events" ADD CONSTRAINT "season_watch_events_cycleSeasonId_fkey" FOREIGN KEY ("cycleSeasonId") REFERENCES "viewing_cycle_seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_labels" ADD CONSTRAINT "custom_labels_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_media_labels" ADD CONSTRAINT "user_media_labels_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "user_media_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_media_labels" ADD CONSTRAINT "user_media_labels_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "custom_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
