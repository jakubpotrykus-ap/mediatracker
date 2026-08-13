import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { appConfig } from "@/config";
import { LanguageSwitcher } from "@/components/language-switcher";
import Image from "next/image";

export default async function AboutPage() {
  const t = await getTranslations("about");
  return <main className="mx-auto min-h-dvh max-w-3xl px-5 py-8"><header className="flex justify-between"><Link href="/" className="font-black"><span className="accent">●</span> {appConfig.name}</Link><LanguageSwitcher /></header><article className="card mt-16 space-y-6 p-7 sm:p-10"><h1 className="text-3xl font-black">{t("title")}</h1><p className="muted leading-7">{t("body")}</p><div className="border-l-2 border-[color:var(--accent)] pl-5"><a href="https://www.themoviedb.org" target="_blank" rel="noreferrer"><Image src="/tmdb-logo.svg" alt="The Movie Database (TMDB)" width={245} height={18} /></a><p className="mt-4 leading-7">{t("tmdb")}</p></div><p className="muted leading-7">{t("anilist")}</p><p className="muted leading-7">{t("manual")}</p></article></main>;
}
