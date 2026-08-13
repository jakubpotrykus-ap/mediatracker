import { ArrowRight, Clock3, Layers3, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { appConfig } from "@/config";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function HomePage() {
  const t = await getTranslations("home");
  const features: Array<{ icon: LucideIcon; title: "featureTime" | "featureCycles" | "featurePrivate"; text: "featureTimeText" | "featureCyclesText" | "featurePrivateText" }> = [
    { icon: Clock3, title: "featureTime", text: "featureTimeText" },
    { icon: Layers3, title: "featureCycles", text: "featureCyclesText" },
    { icon: ShieldCheck, title: "featurePrivate", text: "featurePrivateText" },
  ];
  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-5 py-6 sm:px-8">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-lg font-black tracking-tight"><span className="accent">●</span> {appConfig.name}</Link>
        <div className="flex items-center gap-3"><LanguageSwitcher /><Link className="btn btn-secondary hidden sm:inline-flex" href="/login">{t("login")}</Link></div>
      </header>
      <section className="grid min-h-[68vh] items-center gap-12 py-16 lg:grid-cols-[1.2fr_.8fr]">
        <div>
          <p className="accent mb-4 text-sm font-bold uppercase tracking-[0.2em]">{t("eyebrow")}</p>
          <h1 className="max-w-3xl text-4xl font-black leading-[1.08] tracking-tight sm:text-6xl">{t("title")}</h1>
          <p className="muted mt-6 max-w-2xl text-lg leading-8">{t("description")}</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link className="btn btn-primary" href="/register">{t("start")} <ArrowRight size={18} /></Link><Link className="btn btn-secondary sm:hidden" href="/login">{t("login")}</Link></div>
        </div>
        <div className="card relative overflow-hidden p-6 sm:p-8">
          <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[color:var(--accent)] opacity-[0.07] blur-2xl" />
          <p className="muted text-sm">2026</p><p className="mt-2 text-5xl font-black">3 <span className="text-xl muted">{t("demoDays")}</span> 23 <span className="text-xl muted">{t("demoHours")}</span></p>
          <div className="mt-8 grid grid-cols-6 items-end gap-2" aria-hidden="true">{[25, 48, 32, 72, 56, 90].map((height, index) => <div key={index} className="rounded-t bg-[color:var(--accent)] opacity-80" style={{ height }} />)}</div>
        </div>
      </section>
      <section className="grid gap-4 pb-16 md:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <article key={title} className="card p-6"><Icon className="accent" aria-hidden="true" /><h2 className="mt-5 text-lg font-bold">{t(title)}</h2><p className="muted mt-2 leading-6">{t(text)}</p></article>
        ))}
      </section>
    </main>
  );
}
