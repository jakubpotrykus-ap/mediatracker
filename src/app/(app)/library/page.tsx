import { LibraryStatus } from "@/generated/prisma/enums";
import { getLocale, getTranslations } from "next-intl/server";
import { LibraryCard } from "@/components/library-card";
import { requireUser } from "@/server/current-user";
import { listLabels } from "@/server/services/labels";
import { getLibrary } from "@/server/services/library";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function numberParam(value: string | string[] | undefined, min: number, max: number) {
  if (typeof value !== "string" || value === "") return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : undefined;
}

export default async function LibraryPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const t = await getTranslations("library");
  const common = await getTranslations("common");
  const discover = await getTranslations("discover");
  const locale = (await getLocale()) as "pl" | "en";
  const status = typeof params.status === "string" && Object.values(LibraryStatus).includes(params.status as LibraryStatus) ? params.status as LibraryStatus : undefined;
  const type = typeof params.type === "string" && ["ALL", "MOVIE", "SERIES", "ANIME"].includes(params.type) ? params.type as "ALL" | "MOVIE" | "SERIES" | "ANIME" : undefined;
  const yearFrom = numberParam(params.yearFrom, 1880, 2200);
  const yearTo = numberParam(params.yearTo, 1880, 2200);
  const minWatches = numberParam(params.minWatches, 0, 10_000);
  const activityValue = typeof params.activitySince === "string" ? params.activitySince : "";
  const activitySince = /^\d{4}-\d{2}-\d{2}$/.test(activityValue) ? new Date(`${activityValue}T00:00:00.000Z`) : undefined;
  const sort = typeof params.sort === "string" && ["activity", "added", "title"].includes(params.sort) ? params.sort as "activity" | "added" | "title" : "activity";
  const filters = {
    query: typeof params.query === "string" ? params.query : undefined,
    status,
    type,
    labelId: typeof params.labelId === "string" ? params.labelId : undefined,
    genre: typeof params.genre === "string" ? params.genre : undefined,
    yearFrom,
    yearTo,
    minWatches,
    activitySince: activitySince && !Number.isNaN(activitySince.getTime()) ? activitySince : undefined,
    sort,
  };
  const [entries, labels] = await Promise.all([getLibrary(user.id, filters), listLabels(user.id)]);
  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8"><h1 className="text-3xl font-black">{t("title")}</h1><p className="muted mt-2">{t("subtitle")}</p><form className="card mt-7 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4" method="get"><div className="sm:col-span-2"><label className="label" htmlFor="library-query">{t("query")}</label><input className="input" id="library-query" name="query" defaultValue={typeof params.query === "string" ? params.query : ""} /></div><div><label className="label" htmlFor="library-status">{t("status")}</label><select className="input" id="library-status" name="status" defaultValue={status ?? ""}><option value="">{t("all")}</option>{Object.values(LibraryStatus).map((value) => <option key={value} value={value}>{t(value)}</option>)}</select></div><div><label className="label" htmlFor="library-label">{t("label")}</label><select className="input" id="library-label" name="labelId" defaultValue={typeof params.labelId === "string" ? params.labelId : ""}><option value="">{t("all")}</option>{labels.map((label) => <option key={label.id} value={label.id}>{label.name}</option>)}</select></div><div><label className="label" htmlFor="library-type">{t("type")}</label><select className="input" id="library-type" name="type" defaultValue={type ?? "ALL"}><option value="ALL">{t("all")}</option><option value="MOVIE">{discover("movie")}</option><option value="SERIES">{discover("series")}</option><option value="ANIME">{discover("anime")}</option></select></div><div><label className="label" htmlFor="library-genre">{common("genre")}</label><input className="input" id="library-genre" name="genre" maxLength={80} defaultValue={typeof params.genre === "string" ? params.genre : ""} /></div><div><label className="label" htmlFor="library-year-from">{t("yearFrom")}</label><input className="input" id="library-year-from" name="yearFrom" type="number" min="1880" max="2200" defaultValue={yearFrom} /></div><div><label className="label" htmlFor="library-year-to">{t("yearTo")}</label><input className="input" id="library-year-to" name="yearTo" type="number" min="1880" max="2200" defaultValue={yearTo} /></div><div><label className="label" htmlFor="library-watches">{t("minWatches")}</label><input className="input" id="library-watches" name="minWatches" type="number" min="0" max="10000" defaultValue={minWatches} /></div><div><label className="label" htmlFor="library-activity">{t("activitySince")}</label><input className="input" id="library-activity" name="activitySince" type="date" defaultValue={activityValue} /></div><div><label className="label" htmlFor="library-sort">{t("sort")}</label><select className="input" id="library-sort" name="sort" defaultValue={sort}><option value="activity">{t("sortActivity")}</option><option value="added">{t("sortAdded")}</option><option value="title">{t("sortTitle")}</option></select></div><button className="btn btn-primary self-end lg:col-span-2">{t("apply")}</button></form>{entries.length ? <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{entries.map((entry) => <LibraryCard key={entry.id} entry={entry} locale={locale} />)}</section> : <div className="card mt-6 p-10 text-center muted">{t("empty")} <span className="sr-only">{common("unknown")}</span></div>}</main>;
}
