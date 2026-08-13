import { getTranslations } from "next-intl/server";
import { CatalogSearch } from "@/components/catalog-search";
import { ManualMediaForm } from "@/components/manual-media-form";

export default async function DiscoverPage() {
  const t = await getTranslations("discover");
  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8"><h1 className="text-3xl font-black">{t("title")}</h1><p className="muted mt-2 mb-8">{t("subtitle")}</p><CatalogSearch /><ManualMediaForm /></main>;
}
