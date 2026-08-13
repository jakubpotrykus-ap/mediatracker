import { getLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";
import { LibraryEntryControls, type EntryControlsData } from "@/components/library-entry-controls";
import { localizedDescription, localizedTitle } from "@/lib/domain/title";
import { requireUser } from "@/server/current-user";
import { listLabels } from "@/server/services/labels";
import { getLibraryEntry } from "@/server/services/library";
import { metadataNeedsRefresh, refreshMediaMetadata } from "@/server/services/media";

export default async function LibraryEntryPage({ params }: { params: Promise<{ entryId: string }> }) {
  const user = await requireUser(); const locale = (await getLocale()) as "pl" | "en"; const t = await getTranslations("detail");
  const discover = await getTranslations("discover");
  let entry: Awaited<ReturnType<typeof getLibraryEntry>>;
  try { entry = await getLibraryEntry(user.id, (await params).entryId); } catch { notFound(); }
  if (entry.media.externalIds.length && metadataNeedsRefresh(entry.media.lastSyncedAt)) {
    try {
      await refreshMediaMetadata(user.id, entry.id);
      entry = await getLibraryEntry(user.id, entry.id);
    } catch {
      // Provider downtime must never make the local library unavailable.
    }
  }
  const labels = await listLabels(user.id);
  const controls: EntryControlsData = {
    id: entry.id, status: entry.status, format: entry.media.format, source: entry.media.source,
    selectedLabelIds: entry.labels.map(({ labelId }) => labelId), labels,
    seasons: entry.media.seasons.map((season) => ({
      id: season.id,
      number: season.number,
      name: season.name,
      durationMinutes: season.userDurationOverrides[0]?.durationMinutes ?? season.durationMinutes,
      durationSource: season.userDurationOverrides.length ? "MANUAL" : season.durationSource,
      episodeCount: season.episodeCount,
    })),
    movieEvents: entry.media.movieWatchEvents.map((event) => ({ ...event, watchedAt: event.watchedAt?.toISOString() ?? null, recordedAt: event.recordedAt.toISOString() })),
    seasonEvents: entry.media.seasonWatchEvents.map((event) => ({ ...event, watchedAt: event.watchedAt?.toISOString() ?? null, recordedAt: event.recordedAt.toISOString() })),
    cycles: entry.media.viewingCycles.map((cycle) => ({ id: cycle.id, cycleNumber: cycle.cycleNumber, state: cycle.state, seasons: cycle.seasons.map((season) => ({ id: season.id, seasonNumberSnapshot: season.seasonNumberSnapshot, required: season.required, watchEvent: season.watchEvent ? { id: season.watchEvent.id } : null })) })),
  };
  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8"><section className="grid gap-6 sm:grid-cols-[12rem_1fr]"><div className="relative aspect-[2/3] overflow-hidden rounded-[var(--radius)] bg-[color:var(--surface-raised)]">{entry.media.posterUrl ? <Image src={entry.media.posterUrl} alt="" fill sizes="192px" className="object-cover" priority /> : null}</div><div className="self-end"><div className="flex flex-wrap gap-2"><span className="pill">{entry.media.category === "ANIME" ? discover("anime") : discover("general")}</span><span className="pill">{entry.media.format === "MOVIE" ? discover("movie") : discover("series")}</span></div><h1 className="mt-4 text-3xl font-black sm:text-5xl">{localizedTitle(entry.media, locale)}</h1><p className="muted mt-3">{entry.media.releaseYear ?? "—"} · {t("source", { source: entry.media.source })}</p><p className="muted mt-5 max-w-3xl leading-7">{localizedDescription(entry.media, locale)}</p></div></section><div className="mt-8"><LibraryEntryControls entry={controls} /></div></main>;
}
