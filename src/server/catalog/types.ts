import type { CatalogSource, DurationSource, MediaCategory, MediaFormat } from "@/generated/prisma/enums";

export type CatalogSearchFilters = {
  query: string;
  page: number;
  type: "ALL" | "MOVIE" | "SERIES" | "ANIME";
  genre?: string;
  yearFrom?: number;
  yearTo?: number;
};

export type CatalogSeason = {
  number: number;
  name?: string | null;
  episodeCount?: number | null;
  durationMinutes?: number | null;
  durationSource: DurationSource;
  isSpecial: boolean;
  externalId?: string | null;
};

export type CatalogMedia = {
  provider: CatalogSource;
  externalId: string;
  format: MediaFormat;
  category: MediaCategory;
  titlePl?: string | null;
  titleEn?: string | null;
  titleOriginal: string;
  descriptionPl?: string | null;
  descriptionEn?: string | null;
  releaseDate?: string | null;
  releaseYear?: number | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  genres: string[];
  runtimeMinutes?: number | null;
  runtimeSource: DurationSource;
  averageEpisodeMinutes?: number | null;
  adult: boolean;
  seasons: CatalogSeason[];
};

export type CatalogPage = {
  provider: CatalogSource;
  page: number;
  totalPages: number;
  results: CatalogMedia[];
};

export interface CatalogProvider {
  readonly source: CatalogSource;
  readonly enabled: boolean;
  search(filters: CatalogSearchFilters): Promise<CatalogPage>;
  details(externalId: string, formatHint?: MediaFormat): Promise<CatalogMedia>;
}

export class CatalogUnavailableError extends Error {
  constructor(public readonly provider: CatalogSource, message: string) {
    super(message);
  }
}
