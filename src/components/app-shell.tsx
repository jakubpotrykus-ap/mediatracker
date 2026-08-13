"use client";

import { Compass, Home, Library, LogOut, Menu, Settings, Tags, UserRound, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/language-switcher";

const links = [
  ["/dashboard", "dashboard", Home], ["/discover", "discover", Compass], ["/library", "library", Library], ["/profile", "profile", UserRound], ["/labels", "labels", Tags], ["/settings", "settings", Settings],
] as const;

export function AppShell({ children, appName }: { children: ReactNode; appName: string }) {
  const t = useTranslations("nav");
  const common = useTranslations("common");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className={cn("fixed inset-y-0 left-0 z-40 w-60 border-r border-[color:var(--border)] bg-[color:var(--surface)] p-4 transition-transform lg:sticky lg:top-0 lg:block lg:h-dvh lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center justify-between px-2 py-3"><Link href="/dashboard" className="font-black"><span className="accent">●</span> {appName}</Link><button className="btn btn-secondary !min-h-9 !p-2 lg:hidden" onClick={() => setOpen(false)} aria-label={common("close")}><X size={18} /></button></div>
        <nav className="mt-8 grid gap-1">{links.map(([href, key, Icon]) => <Link key={href} href={href} onClick={() => setOpen(false)} className={cn("flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold", pathname.startsWith(href) ? "bg-[color:var(--surface-raised)] text-[color:var(--accent)]" : "muted hover:text-[color:var(--text)]")}><Icon size={19} />{t(key)}</Link>)}</nav>
        <div className="absolute bottom-5 left-4 right-4 grid gap-3"><LanguageSwitcher /><button className="btn btn-secondary w-full justify-start" onClick={() => void signOut({ callbackUrl: "/" })}><LogOut size={18} />{t("logout")}</button></div>
      </aside>
      {open ? <button className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} aria-label={common("close")} /> : null}
      <div className="min-w-0 pb-24 lg:pb-0"><header className="sticky top-0 z-20 flex h-16 items-center border-b border-[color:var(--border)] bg-[color:var(--bg)]/90 px-4 backdrop-blur lg:hidden"><button className="btn btn-secondary !min-h-10 !p-2.5" onClick={() => setOpen(true)}><Menu size={20} /><span className="sr-only">{common("menu")}</span></button><span className="ml-3 font-black"><span className="accent">●</span> {appName}</span></header>{children}</div>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-[color:var(--border)] bg-[color:var(--surface)] p-1 pb-[max(.25rem,env(safe-area-inset-bottom))] lg:hidden">{links.slice(0, 4).map(([href, key, Icon]) => <Link key={href} href={href} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[.68rem]", pathname.startsWith(href) ? "text-[color:var(--accent)]" : "muted")}><Icon size={19} />{t(key)}</Link>)}</nav>
    </div>
  );
}
