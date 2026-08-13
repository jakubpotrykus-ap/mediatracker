import { getTranslations } from "next-intl/server";
import { SettingsForms } from "@/components/settings-forms";
import { requireUser } from "@/server/current-user";

export default async function SettingsPage() { const user = await requireUser(); const t = await getTranslations("settings"); return <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8"><h1 className="mb-7 text-3xl font-black">{t("title")}</h1><SettingsForms data={{ displayName: user.displayName ?? "", bio: user.bio ?? "", locale: user.settings?.locale ?? "PL", timezone: user.settings?.timezone ?? "Europe/Warsaw", profilePublic: user.settings?.profilePublic ?? false, showStats: user.settings?.showStats ?? true, showLibrary: user.settings?.showLibrary ?? false }} /></main>; }
