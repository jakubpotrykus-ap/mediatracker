import "server-only";
import { createHash } from "node:crypto";
import { CatalogSource, type MediaFormat } from "@/generated/prisma/enums";
import { env, appConfig } from "@/config";
import { AniListProvider } from "@/server/catalog/anilist";
import { TestCatalogProvider } from "@/server/catalog/test-provider";
import { TmdbProvider } from "@/server/catalog/tmdb";
import type { CatalogMedia, CatalogPage, CatalogProvider, CatalogSearchFilters } from "@/server/catalog/types";
import { db } from "@/server/db";

function providers(): CatalogProvider[] {
  if (env.CATALOG_TEST_MODE === "true") return [new TestCatalogProvider()];
  return [new TmdbProvider(), new AniListProvider()].filter((provider) => provider.enabled);
}

function provider(source: CatalogSource) {
  const selected = providers().find((candidate) => candidate.source === source);
  if (!selected) throw new Error("CATALOG_PROVIDER_DISABLED");
  return selected;
}

export function catalogStatus() {
  const active = providers().map((item) => item.source);
  return {
    active,
    tmdbConfigured: Boolean(env.TMDB_API_TOKEN),
    aniListEnabled: active.includes(CatalogSource.ANILIST),
    manualAvailable: true,
  };
}

export async function searchCatalog(filters: CatalogSearchFilters) {
  const key = `search:${createHash("sha256").update(JSON.stringify(filters)).digest("hex")}`;
  const cached = await db.catalogCache.findUnique({ where: { key } });
  if (cached && cached.expiresAt > new Date()) return cached.value as unknown as CatalogPage[];
  const activeProviders = providers();
  if (activeProviders.length === 0) return [];
  const settled = await Promise.allSettled(activeProviders.map((item) => item.search(filters)));
  const pages = settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  if (pages.length === 0) throw new Error("CATALOG_UNAVAILABLE");
  await db.catalogCache.upsert({
    where: { key },
    create: { key, value: pages as never, expiresAt: new Date(Date.now() + appConfig.catalogCacheTtlSeconds * 1000) },
    update: { value: pages as never, expiresAt: new Date(Date.now() + appConfig.catalogCacheTtlSeconds * 1000) },
  });
  return pages;
}

export async function catalogDetails(source: CatalogSource, externalId: string, formatHint?: MediaFormat): Promise<CatalogMedia> {
  return provider(source).details(externalId, formatHint);
}
