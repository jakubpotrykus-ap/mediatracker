import { getTranslations } from "next-intl/server";
import { LabelsManager } from "@/components/labels-manager";
import { requireUser } from "@/server/current-user";
import { listLabels } from "@/server/services/labels";

export default async function LabelsPage() { const user = await requireUser(); const t = await getTranslations("labels"); return <main className="mx-auto max-w-4xl px-4 py-8 sm:px-8"><h1 className="text-3xl font-black">{t("title")}</h1><p className="muted mb-7 mt-2">{t("subtitle")}</p><LabelsManager labels={await listLabels(user.id)} /></main>; }
