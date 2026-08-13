import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { localizedTitle } from "@/lib/domain/title";
import type { getLibrary } from "@/server/services/library";

export async function LibraryCard({ entry, locale }: { entry: Awaited<ReturnType<typeof getLibrary>>[number]; locale: "pl" | "en" }) {
  const t = await getTranslations("library");
  const watches = entry.media.format === "MOVIE" ? entry.media.movieWatchEvents.length : entry.media.viewingCycles.length;
  return <article className="card flex min-w-0 overflow-hidden"><div className="relative w-24 shrink-0 bg-[color:var(--surface-raised)] sm:w-32">{entry.media.posterUrl ? <Image src={entry.media.posterUrl} alt="" fill sizes="128px" className="object-cover" /> : null}</div><div className="min-w-0 flex-1 p-4"><div className="flex flex-wrap gap-2"><span className="pill">{t(entry.status)}</span>{entry.labels.map(({ label }) => <span key={label.id} className="pill" style={{ borderColor: label.color ?? undefined }}>{label.name}</span>)}</div><h2 className="mt-3 truncate text-lg font-bold">{localizedTitle(entry.media, locale)}</h2><p className="muted mt-1 text-sm">{entry.media.releaseYear ?? "—"} · {t("watches", { count: watches })}</p><Link className="btn btn-secondary mt-4 !min-h-9 text-sm" href={`/library/${entry.id}`}>{t("details")}</Link></div></article>;
}
