"use client";

import { Plus, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { CatalogMedia, CatalogPage } from "@/server/catalog/types";
import { useToast } from "@/components/providers";
import { localizedTitle } from "@/lib/domain/title";

type ApiResponse = { pages: CatalogPage[]; status: { tmdbConfigured: boolean; manualAvailable: boolean } };

export function CatalogSearch() {
  const t = useTranslations("discover");
  const common = useTranslations("common");
  const locale = useLocale() as "pl" | "en";
  const notify = useToast();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [type, setType] = useState("ALL");
  const [genre, setGenre] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ key: string; value: ApiResponse } | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebounced(query.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  const requestKey = [debounced, type, genre, yearFrom, yearTo, page].join(":");

  useEffect(() => {
    if (debounced.length < 2) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ query: debounced, type, page: String(page) });
    if (genre) params.set("genre", genre);
    if (yearFrom) params.set("yearFrom", yearFrom);
    if (yearTo) params.set("yearTo", yearTo);
    fetch(`/api/catalog/search?${params}`, { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(); return (await response.json()) as ApiResponse; })
      .then((value) => setResult({ key: requestKey, value }))
      .catch((reason: unknown) => { if (!(reason instanceof DOMException && reason.name === "AbortError")) setErrorKey(requestKey); });
    return () => controller.abort();
  }, [debounced, type, genre, yearFrom, yearTo, page, requestKey]);

  async function add(item: CatalogMedia) {
    const response = await fetch("/api/library", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: item.provider, externalId: item.externalId, formatHint: item.format }),
    });
    notify(response.ok ? t("added") : common("error"), response.ok ? "success" : "error");
  }
  const data = result?.key === requestKey ? result.value : null;
  const loading = debounced.length >= 2 && !data && errorKey !== requestKey;
  const error = errorKey === requestKey;
  const results = data?.pages.flatMap((providerPage) => providerPage.results) ?? [];
  const canNext = data?.pages.some((providerPage) => providerPage.page < providerPage.totalPages) ?? false;
  return (
    <div>
      <div className="card p-4 sm:p-5">
        <label className="label" htmlFor="catalog-query">{common("search")}</label>
        <div className="relative"><Search className="muted absolute left-3 top-3" size={20} /><input id="catalog-query" className="input !pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("placeholder")} /></div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <select className="input" value={type} onChange={(event) => setType(event.target.value)}><option value="ALL">{t("all")}</option><option value="MOVIE">{t("movie")}</option><option value="SERIES">{t("series")}</option><option value="ANIME">{t("anime")}</option></select>
          <input className="input" value={genre} onChange={(event) => setGenre(event.target.value)} placeholder={common("genre")} maxLength={80} />
          <input className="input" type="number" min="1880" max="2200" value={yearFrom} onChange={(event) => setYearFrom(event.target.value)} placeholder={t("yearFrom")} />
          <input className="input" type="number" min="1880" max="2200" value={yearTo} onChange={(event) => setYearTo(event.target.value)} placeholder={t("yearTo")} />
          <p className="muted self-center text-xs sm:pl-2">{t("sourceNotice")}</p>
        </div>
      </div>
      {data && !data.status.tmdbConfigured ? <p className="mt-4 rounded-lg border border-[color:var(--border)] p-3 text-sm muted">{t("tmdbMissing")}</p> : null}
      {loading ? <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="card h-80 animate-pulse" />)}</div> : null}
      {error ? <p role="alert" className="card mt-6 p-5 text-[color:var(--danger)]">{common("error")}</p> : null}
      {!loading && debounced.length < 2 ? <p className="muted py-12 text-center">{t("start")}</p> : null}
      {!loading && debounced.length >= 2 && data && !results.length ? <p className="muted py-12 text-center">{t("empty")}</p> : null}
      {!loading && results.length ? <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">{results.map((item) => <article className="card overflow-hidden" key={`${item.provider}-${item.externalId}`}><div className="relative aspect-[2/3] bg-[color:var(--surface-raised)]">{item.posterUrl ? <Image src={item.posterUrl} alt="" fill sizes="(max-width: 640px) 50vw, 20vw" className="object-cover" /> : null}<span className="pill absolute left-2 top-2">{item.provider}</span></div><div className="p-3"><h2 className="line-clamp-2 min-h-12 font-bold">{localizedTitle(item, locale)}</h2><p className="muted mt-1 text-xs">{item.releaseYear ?? common("unknown")} · {item.category === "ANIME" ? t("anime") : item.format === "MOVIE" ? t("movie") : t("series")}</p><button className="btn btn-primary mt-4 w-full !px-2 text-xs" onClick={() => void add(item)}><Plus size={16} />{t("addLibrary")}</button></div></article>)}</div> : null}
      {canNext ? <div className="mt-7 text-center"><button className="btn btn-secondary" onClick={() => setPage((value) => value + 1)}>{t("loadMore")}</button></div> : null}
    </div>
  );
}
