"use client";

import { RefreshCw, Trash2, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useToast } from "@/components/providers";

type Label = { id: string; name: string; color: string | null };
type Season = { id: string; number: number; name: string | null; durationMinutes: number | null; durationSource: string; episodeCount: number | null };
type MovieEvent = { id: string; watchedAt: string | null; watchedAtUnknown: boolean; recordedAt: string; durationMinutesSnapshot: number };
type SeasonEvent = MovieEvent & { seasonNumberSnapshot: number; cycleId: string | null; episodeCountSnapshot: number | null };
type Cycle = { id: string; cycleNumber: number; state: string; seasons: Array<{ id: string; seasonNumberSnapshot: number; required: boolean; watchEvent: { id: string } | null }> };

export type EntryControlsData = {
  id: string; status: string; format: "MOVIE" | "SERIES"; source: string;
  selectedLabelIds: string[]; labels: Label[]; seasons: Season[]; movieEvents: MovieEvent[]; seasonEvents: SeasonEvent[]; cycles: Cycle[];
};

export function LibraryEntryControls({ entry }: { entry: EntryControlsData }) {
  const t = useTranslations("detail");
  const libraryT = useTranslations("library");
  const common = useTranslations("common");
  const router = useRouter();
  const notify = useToast();
  const [pending, setPending] = useState(false);
  async function request(path: string, method: string, body?: unknown) {
    setPending(true);
    const response = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    notify(response.ok ? common("success") : common("error"), response.ok ? "success" : "error");
    setPending(false);
    if (response.ok) router.refresh();
    return response;
  }
  async function saveStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await request(`/api/library/${entry.id}`, "PATCH", { status: form.get("status"), labelIds: form.getAll("labels") });
  }
  async function addMovie(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const count = Number(form.get("count"));
    const dates = String(form.get("dates") ?? "").split(/[\n,]/).map((value) => value.trim()).filter(Boolean);
    const watchedDates = Array.from({ length: count }, (_, index) => {
      const date = dates[index];
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
      const parsed = new Date(`${date}T12:00:00.000Z`);
      return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    });
    await request(`/api/library/${entry.id}/watches`, "POST", { action: "ADD_MOVIE", count, watchedDates });
  }
  async function completeCycles(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await request(`/api/library/${entry.id}/watches`, "POST", { action: "COMPLETE_CYCLES", count: Number(form.get("count")) });
  }
  return (
    <div className="grid gap-6">
      <form className="card grid gap-4 p-5" onSubmit={saveStatus}><div><label className="label" htmlFor="entry-status">{t("status")}</label><select className="input" id="entry-status" name="status" defaultValue={entry.status}>{["PLAN_TO_WATCH", "WATCHING", "COMPLETED", "ON_HOLD", "DROPPED", "REWATCHING"].map((status) => <option key={status} value={status}>{libraryT(status)}</option>)}</select></div><fieldset><legend className="label">{t("labels")}</legend><div className="flex flex-wrap gap-2">{entry.labels.map((label) => <label key={label.id} className="pill flex cursor-pointer items-center gap-2" style={{ borderColor: label.color ?? undefined }}><input type="checkbox" name="labels" value={label.id} defaultChecked={entry.selectedLabelIds.includes(label.id)} />{label.name}</label>)}</div></fieldset><button className="btn btn-primary" disabled={pending}>{t("saveStatus")}</button></form>
      {entry.format === "MOVIE" ? <section className="card p-5"><h2 className="text-xl font-bold">{t("movieHistory")}</h2><form className="mt-5 grid gap-3 sm:grid-cols-[7rem_1fr_auto] sm:items-end" onSubmit={addMovie}><div><label className="label" htmlFor="watch-count">{t("watchCount")}</label><input className="input" id="watch-count" name="count" type="number" min="1" max="50" defaultValue="1" required /></div><div><label className="label" htmlFor="watch-dates">{t("watchDates")}</label><textarea className="input min-h-11 resize-y" id="watch-dates" name="dates" rows={1} placeholder={t("watchDatesHint")} /></div><button className="btn btn-primary" disabled={pending}>{t("addWatches")}</button><p className="muted text-xs sm:col-span-3">{t("unknownDates")}</p></form><div className="mt-6 grid gap-2">{entry.movieEvents.length ? entry.movieEvents.map((watch) => <div className="flex items-center justify-between rounded-lg bg-[color:var(--surface-raised)] p-3 text-sm" key={watch.id}><span>{watch.durationMinutesSnapshot} {common("minutes")} · {watch.watchedAtUnknown ? t("dateUnknown") : new Date(watch.watchedAt!).toLocaleDateString()}</span><button className="btn btn-danger !min-h-9 !p-2" title={t("removeEvent")} onClick={() => void request(`/api/library/${entry.id}/watches`, "POST", { action: "REMOVE_MOVIE", eventId: watch.id })}><Trash2 size={16} /></button></div>) : <p className="muted">{t("noEvents")}</p>}</div></section> : <SeriesControls entry={entry} pending={pending} request={request} onComplete={completeCycles} />}
      <section className="card flex flex-wrap gap-3 p-5"><button className="btn btn-secondary" disabled={pending || entry.source === "MANUAL"} onClick={() => void request(`/api/library/${entry.id}`, "PATCH", { refreshMetadata: true })}><RefreshCw size={17} />{t("refresh")}</button><button className="btn btn-danger" disabled={pending} onClick={() => { if (window.confirm(common("confirmDelete"))) void request(`/api/library/${entry.id}`, "DELETE").then((response) => { if (response.ok) router.push("/library"); }); }}><Trash2 size={17} />{t("removeEntry")}</button></section>
    </div>
  );
}

function SeriesControls({ entry, pending, request, onComplete }: { entry: EntryControlsData; pending: boolean; request: (path: string, method: string, body?: unknown) => Promise<Response>; onComplete: (event: FormEvent<HTMLFormElement>) => Promise<void> }) {
  const t = useTranslations("detail");
  const common = useTranslations("common");
  const [includeSpecials, setIncludeSpecials] = useState(false);
  const [seasonDates, setSeasonDates] = useState<Record<string, string>>({});
  const active = entry.cycles.find((cycle) => cycle.state === "ACTIVE");
  function watchedAt(seasonId: string) {
    const value = seasonDates[seasonId];
    return value ? new Date(`${value}T12:00:00.000Z`).toISOString() : null;
  }
  return (
    <section className="card p-5">
      <h2 className="text-xl font-bold">{t("cycles")}</h2>
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div className="grid gap-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeSpecials} onChange={(event) => setIncludeSpecials(event.target.checked)} />{t("includeSpecials")}</label>
          <button className="btn btn-primary" disabled={pending} onClick={() => void request(`/api/library/${entry.id}/watches`, "POST", { action: "START_CYCLE", includeSpecials })}>{t("startCycle")}</button>
        </div>
        <form className="flex items-end gap-2" onSubmit={onComplete}>
          <div><label className="label" htmlFor="cycle-count">{t("completeMany")}</label><input className="input !w-24" id="cycle-count" name="count" type="number" min="1" max="20" defaultValue="1" /></div>
          <button className="btn btn-secondary" disabled={pending}>{common("add")}</button>
        </form>
        {active ? <button className="btn btn-danger" disabled={pending} onClick={() => void request(`/api/library/${entry.id}/watches`, "POST", { action: "CANCEL_CYCLE", cycleId: active.id })}>{t("cancelCycle")}</button> : null}
      </div>
      <div className="mt-7 grid gap-3">
        {entry.seasons.map((season) => {
          const watched = active?.seasons.find((item) => item.seasonNumberSnapshot === season.number)?.watchEvent;
          return (
            <div className="rounded-lg border border-[color:var(--border)] p-4" key={season.id}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="mr-auto"><h3 className="font-bold">{season.name || t("season", { number: season.number })}</h3><p className="muted mt-1 text-xs">{season.durationMinutes ? `${season.durationMinutes} ${common("minutes")} · ${season.episodeCount ?? "—"} ${common("episodes")}` : t("durationMissing")}</p></div>
                {watched ? (
                  <button className="btn btn-secondary !min-h-9" onClick={() => void request(`/api/library/${entry.id}/watches`, "POST", { action: "UNDO_SEASON", eventId: watched.id })}><Undo2 size={16} />{t("undo")}</button>
                ) : season.durationMinutes ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <div><label className="label" htmlFor={`season-date-${season.id}`}>{t("watchDate")}</label><input className="input !min-h-9 !w-40 !py-1" id={`season-date-${season.id}`} type="date" value={seasonDates[season.id] ?? ""} onChange={(event) => setSeasonDates((values) => ({ ...values, [season.id]: event.target.value }))} /></div>
                    <button className="btn btn-primary !min-h-9" onClick={() => void request(`/api/library/${entry.id}/watches`, "POST", { action: "MARK_SEASON", seasonId: season.id, cycleId: active?.id, watchedAt: watchedAt(season.id) })}>{t("mark")}</button>
                    <button className="btn btn-secondary !min-h-9 text-xs" onClick={() => void request(`/api/library/${entry.id}/watches`, "POST", { action: "MARK_SEASON", seasonId: season.id, standalone: true, watchedAt: watchedAt(season.id) })}>{t("standalone")}</button>
                  </div>
                ) : (
                  <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void request(`/api/library/${entry.id}/watches`, "POST", { action: "SET_SEASON_DURATION", seasonId: season.id, durationMinutes: Number(form.get("duration")) }); }}><input aria-label={t("setDuration")} className="input !w-28" name="duration" type="number" min="1" max="100000" required /><button className="btn btn-secondary !min-h-9">{common("save")}</button></form>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-7 grid gap-2">{entry.cycles.map((cycle) => <div key={cycle.id} className="flex items-center justify-between rounded-lg bg-[color:var(--surface-raised)] px-4 py-3"><span>{t("cycle", { number: cycle.cycleNumber })}</span><span className="pill">{cycle.state === "COMPLETED" ? t("completed") : cycle.state === "ACTIVE" ? t("active") : t("cancelled")}</span></div>)}</div>
    </section>
  );
}
