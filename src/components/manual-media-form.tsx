"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useToast } from "@/components/providers";

export function ManualMediaForm() {
  const t = useTranslations("discover");
  const common = useTranslations("common");
  const notify = useToast();
  const router = useRouter();
  const [format, setFormat] = useState("MOVIE");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true);
    const form = new FormData(event.currentTarget);
    const durations = String(form.get("seasons") ?? "").split(",").map((value) => Number(value.trim())).filter((value) => value > 0);
    const response = await fetch("/api/library/manual", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"), format, category: form.get("category"),
        releaseYear: form.get("year") ? Number(form.get("year")) : undefined,
        genres: String(form.get("genres") ?? "").split(",").map((value) => value.trim()).filter(Boolean),
        runtimeMinutes: format === "MOVIE" ? Number(form.get("runtime")) : undefined,
        seasons: format === "SERIES" ? durations.map((durationMinutes, index) => ({ number: index + 1, durationMinutes })) : [],
      }),
    });
    const body = (await response.json().catch(() => null)) as { id?: string } | null;
    notify(response.ok ? t("manualAdded") : common("error"), response.ok ? "success" : "error");
    setPending(false);
    if (response.ok && body?.id) router.push(`/library/${body.id}`);
  }
  return <form className="card mt-10 grid gap-4 p-5 sm:grid-cols-2 sm:p-7" onSubmit={submit}><div className="sm:col-span-2"><h2 className="text-xl font-bold">{t("manualTitle")}</h2><p className="muted mt-1 text-sm">{t("manualDescription")}</p></div><div><label className="label" htmlFor="manual-title">{t("titleField")}</label><input className="input" id="manual-title" name="title" maxLength={300} required /></div><div><label className="label" htmlFor="manual-year">{common("year")}</label><input className="input" id="manual-year" name="year" type="number" min="1880" max="2200" /></div><div><label className="label" htmlFor="manual-format">{t("format")}</label><select className="input" id="manual-format" name="format" value={format} onChange={(event) => setFormat(event.target.value)}><option value="MOVIE">{t("movie")}</option><option value="SERIES">{t("series")}</option></select></div><div><label className="label" htmlFor="manual-category">{t("category")}</label><select className="input" id="manual-category" name="category"><option value="GENERAL">{t("general")}</option><option value="ANIME">{t("anime")}</option></select></div><div className="sm:col-span-2"><label className="label" htmlFor="manual-genres">{t("genres")}</label><input className="input" id="manual-genres" name="genres" /></div>{format === "MOVIE" ? <div className="sm:col-span-2"><label className="label" htmlFor="manual-runtime">{t("runtime")}</label><input className="input" id="manual-runtime" name="runtime" type="number" min="1" max="100000" required /></div> : <div className="sm:col-span-2"><label className="label" htmlFor="manual-seasons">{t("seasonDurations")}</label><input className="input" id="manual-seasons" name="seasons" placeholder="600, 500" required /></div>}<button className="btn btn-primary sm:col-span-2" disabled={pending}>{pending ? common("loading") : t("create")}</button></form>;
}
