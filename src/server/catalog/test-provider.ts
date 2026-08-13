import { CatalogSource, DurationSource, MediaCategory, MediaFormat } from "@/generated/prisma/enums";
import type { CatalogMedia, CatalogPage, CatalogProvider, CatalogSearchFilters } from "@/server/catalog/types";

const fixture: CatalogMedia[] = [
  {
    provider: CatalogSource.TEST,
    externalId: "fixture-movie",
    format: MediaFormat.MOVIE,
    category: MediaCategory.GENERAL,
    titlePl: "Testowy film",
    titleEn: "Fixture Movie",
    titleOriginal: "Fixture Movie",
    descriptionPl: "Lokalny wynik używany przez testy end-to-end.",
    descriptionEn: "Local result used by end-to-end tests.",
    releaseYear: 2026,
    genres: ["Drama"],
    runtimeMinutes: 100,
    runtimeSource: DurationSource.EXACT,
    adult: false,
    seasons: [],
  },
  {
    provider: CatalogSource.TEST,
    externalId: "fixture-series",
    format: MediaFormat.SERIES,
    category: MediaCategory.GENERAL,
    titlePl: "Testowy serial",
    titleEn: "Fixture Series",
    titleOriginal: "Fixture Series",
    releaseYear: 2026,
    genres: ["Drama"],
    runtimeSource: DurationSource.UNKNOWN,
    adult: false,
    seasons: [
      { number: 1, name: "Sezon 1", episodeCount: 10, durationMinutes: 600, durationSource: DurationSource.EXACT, isSpecial: false },
      { number: 2, name: "Sezon 2", episodeCount: 8, durationMinutes: 500, durationSource: DurationSource.EXACT, isSpecial: false },
    ],
  },
];

export class TestCatalogProvider implements CatalogProvider {
  readonly source = CatalogSource.TEST;
  readonly enabled = true;

  async search(filters: CatalogSearchFilters): Promise<CatalogPage> {
    const query = filters.query.toLocaleLowerCase();
    const results = fixture.filter((item) =>
      [item.titlePl, item.titleEn, item.titleOriginal].some((title) => title?.toLocaleLowerCase().includes(query)),
    );
    return { provider: this.source, page: 1, totalPages: 1, results };
  }

  async details(externalId: string) {
    const media = fixture.find((item) => item.externalId === externalId);
    if (!media) throw new Error("CATALOG_ITEM_NOT_FOUND");
    return media;
  }
}
