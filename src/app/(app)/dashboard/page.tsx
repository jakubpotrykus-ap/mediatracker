import { Clock3, Film, Layers3, PlayCircle, RotateCcw, Tv } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { formatWatchTime } from "@/lib/domain/time";
import { localizedTitle } from "@/lib/domain/title";
import { requireUser } from "@/server/current-user";
import { getLibrary } from "@/server/services/library";
import { getUserStats } from "@/server/services/stats";

export default async function DashboardPage() {
  const user = await requireUser();
  const locale = (await getLocale()) as "pl" | "en";
  const t = await getTranslations("dashboard");
  const [stats, library] = await Promise.all([getUserStats(user.id, locale), getLibrary(user.id)]);
  const cards = [[Clock3, t("totalTime"), formatWatchTime(stats.totalMinutes, locale)], [Film, t("movies"), stats.uniqueMovies], [Tv, t("series"), stats.uniqueSeries], [PlayCircle, t("anime"), stats.uniqueAnime], [Film, t("fullMovieWatches"), stats.fullMovieWatches], [Tv, t("cycles"), stats.completedSeriesCycles], [RotateCcw, t("rewatches"), stats.rewatches], [Layers3, t("seasons"), stats.watchedSeasons], [PlayCircle, t("episodes"), stats.approximateEpisodes]] as const;
  const maxMonth = Math.max(1, ...stats.monthly.map((item) => item.value));
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <h1 className="text-3xl font-black tracking-tight">{t("hello", { name: user.displayName ?? user.username })}</h1><p className="muted mt-2">{t("subtitle")}</p>
      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{cards.map(([Icon, label, value]) => <article key={label} className="card p-4"><Icon className="accent" size={20} /><p className="muted mt-5 text-xs">{label}</p><p className="mt-1 text-xl font-black">{value}</p></article>)}</section>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_.6fr]">
        <section className="card p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">{t("monthly")}</h2><span className="pill">{stats.totalHours} h</span></div>{stats.monthly.length ? <div className="mt-8 flex h-48 items-end gap-2 overflow-x-auto" role="img" aria-label={t("monthly")}>{stats.monthly.slice(-12).map((item) => <div key={item.name} className="flex min-w-10 flex-1 flex-col items-center gap-2"><div className="w-full rounded-t bg-[color:var(--accent)] opacity-80" style={{ height: `${Math.max(4, (item.value / maxMonth) * 150)}px` }} /><span className="muted text-[.65rem]">{item.name.slice(5)}</span></div>)}</div> : <Empty />}</section>
        <section className="card p-5 sm:p-6"><h2 className="text-lg font-bold">{t("favoriteByTime")}</h2>{stats.genresByTime.length ? <div className="mt-5 grid gap-4">{stats.genresByTime.map((genre) => <div key={genre.name}><div className="flex justify-between text-sm"><span>{genre.name}</span><span className="muted">{formatWatchTime(genre.value, locale)}</span></div><div className="mt-2 h-1.5 rounded bg-[color:var(--surface-raised)]"><div className="h-full rounded bg-[color:var(--accent)]" style={{ width: `${Math.max(6, (genre.value / stats.genresByTime[0]!.value) * 100)}%` }} /></div></div>)}</div> : <Empty />}</section>
      </div>
      <section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3"><Summary title={t("timeBreakdown")} items={[[t("moviesTime"), stats.timeByType.movies], [t("seriesTime"), stats.timeByType.series], [t("animeTime"), stats.timeByType.anime]]} locale={locale} time /><Summary title={t("favoriteByCount")} items={stats.genresByProductions.map((item) => [item.name, item.value])} locale={locale} /><Summary title={t("yearly")} items={stats.yearly.map((item) => [item.name, item.value])} locale={locale} time /></section>
      <section className="mt-6 grid gap-6 md:grid-cols-2"><Summary title={t("mostWatched")} items={stats.mostWatched.map((item) => [item.name, item.value])} locale={locale} time /><Summary title={t("mostRewatched")} items={stats.mostRewatched.map((item) => [item.name, item.value])} locale={locale} /></section>
      <section className="mt-6 grid gap-6 lg:grid-cols-3"><List title={t("activity")} items={library} locale={locale} /><List title={t("watching")} items={library.filter((entry) => entry.status === "WATCHING" || entry.status === "REWATCHING")} locale={locale} /><List title={t("planned")} items={library.filter((entry) => entry.status === "PLAN_TO_WATCH")} locale={locale} /></section>
      {!library.length ? <div className="card mt-6 p-8 text-center"><p className="muted">{t("empty")}</p><Link className="btn btn-primary mt-5" href="/discover">{t("discover")}</Link></div> : null}
    </main>
  );
}

function Empty() { return <div className="mt-12 h-20 rounded-lg border border-dashed border-[color:var(--border)]" />; }
function List({ title, items, locale }: { title: string; items: Awaited<ReturnType<typeof getLibrary>>; locale: "pl" | "en" }) {
  return <section className="card p-5 sm:p-6"><h2 className="text-lg font-bold">{title}</h2>{items.length ? <div className="mt-4 grid gap-2">{items.slice(0, 5).map((entry) => <Link href={`/library/${entry.id}`} key={entry.id} className="flex items-center justify-between rounded-lg bg-[color:var(--surface-raised)] px-4 py-3"><span className="font-semibold">{localizedTitle(entry.media, locale)}</span><span className="muted text-sm">{entry.media.releaseYear ?? "—"}</span></Link>)}</div> : <Empty />}</section>;
}

function Summary({ title, items, locale, time = false }: { title: string; items: Array<[string, number]>; locale: "pl" | "en"; time?: boolean }) {
  return <section className="card p-5 sm:p-6"><h2 className="text-lg font-bold">{title}</h2>{items.length ? <ol className="mt-4 grid gap-3">{items.slice(0, 6).map(([name, value], index) => <li className="flex justify-between gap-4 text-sm" key={name}><span><span className="muted mr-2">{index + 1}.</span>{name}</span><span className="muted text-right">{time ? formatWatchTime(value, locale) : value}</span></li>)}</ol> : <Empty />}</section>;
}
