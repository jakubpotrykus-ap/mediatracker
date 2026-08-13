"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LanguageSwitcher() {
  const current = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function change(locale: "pl" | "en") {
    setPending(true);
    const accountResponse = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: locale.toUpperCase() }),
    });
    if (!accountResponse.ok) {
      await fetch("/api/locale", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale }) });
    }
    router.refresh();
    setPending(false);
  }
  return (
    <label className="inline-flex items-center gap-2 text-sm muted">
      <Languages size={17} aria-hidden="true" />
      <span className="sr-only">{t("switchLanguage")}</span>
      <select className="input !min-h-9 !w-auto !py-1" value={current} onChange={(event) => void change(event.target.value as "pl" | "en")} disabled={pending}>
        <option value="pl">{t("pl")}</option>
        <option value="en">{t("en")}</option>
      </select>
    </label>
  );
}
