import "server-only";
import { CatalogSource, DurationSource, MediaCategory, MediaFormat } from "@/generated/prisma/enums";
import { env } from "@/config";
import { catalogFetch } from "@/server/catalog/http";
import {
  CatalogUnavailableError,
  type CatalogMedia,
  type CatalogPage,
  type CatalogProvider,
  type CatalogSearchFilters,
} from "@/server/catalog/types";

type AniMedia = {
  id: number;
  title: { romaji?: string | null; english?: string | null; native?: string | null };
  description?: string | null;
  format?: string | null;
  episodes?: number | null;
  duration?: number | null;
  genres?: string[] | null;
  seasonYear?: number | null;
  isAdult?: boolean;
  coverImage?: { extraLarge?: string | null; large?: string | null };
  bannerImage?: string | null;
};

type AniResponse = { data?: { Page?: { pageInfo: { currentPage: number; lastPage: number }; media: AniMedia[] }; Media?: AniMedia }; errors?: unknown[] };

const fields = `id title { romaji english native } description(asHtml: false) format episodes duration genres seasonYear isAdult coverImage { extraLarge large } bannerImage`;

function mapMedia(media: AniMedia): CatalogMedia {
  const isMovie = media.format === "MOVIE";
  const total = media.episodes && media.duration ? media.episodes * media.duration : null;
  return {
    provider: CatalogSource.ANILIST,
    externalId: String(media.id),
    format: isMovie ? MediaFormat.MOVIE : MediaFormat.SERIES,
    category: MediaCategory.ANIME,
    titlePl: null,
    titleEn: media.title.english,
    titleOriginal: media.title.native ?? media.title.romaji ?? media.title.english ?? "Untitled",
    descriptionPl: null,
    descriptionEn: media.description?.replace(/<[^>]+>/g, "") ?? null,
    releaseYear: media.seasonYear,
    posterUrl: media.coverImage?.extraLarge ?? media.coverImage?.large,
    backdropUrl: media.bannerImage,
    genres: media.genres ?? [],
    runtimeMinutes: isMovie ? media.duration : null,
    runtimeSource: media.duration ? DurationSource.ESTIMATED : DurationSource.UNKNOWN,
    averageEpisodeMinutes: isMovie ? null : media.duration,
    adult: Boolean(media.isAdult),
    seasons: isMovie
      ? []
      : [
          {
            number: 1,
            name: media.title.english ?? media.title.romaji,
            episodeCount: media.episodes,
            durationMinutes: total,
            durationSource: total ? DurationSource.ESTIMATED : DurationSource.UNKNOWN,
            isSpecial: false,
            externalId: String(media.id),
          },
        ],
  };
}

export class AniListProvider implements CatalogProvider {
  readonly source = CatalogSource.ANILIST;
  readonly enabled = env.ANILIST_ENABLED === "true" && env.ANILIST_TERMS_ACCEPTED === "true";

  private async query(query: string, variables: Record<string, unknown>) {
    if (!this.enabled) throw new CatalogUnavailableError(this.source, "ANILIST_DISABLED_OR_TERMS_NOT_ACCEPTED");
    const response = await catalogFetch(env.ANILIST_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const body = (await response.json()) as AniResponse;
    if (body.errors) throw new Error("ANILIST_GRAPHQL_ERROR");
    return body;
  }

  async search(filters: CatalogSearchFilters): Promise<CatalogPage> {
    if (!(["ALL", "ANIME"].includes(filters.type))) return { provider: this.source, page: filters.page, totalPages: 0, results: [] };
    const response = await this.query(
      `query Search($search: String!, $page: Int!) { Page(page: $page, perPage: 20) { pageInfo { currentPage lastPage } media(search: $search, type: ANIME, isAdult: false, sort: SEARCH_MATCH) { ${fields} } } }`,
      { search: filters.query, page: filters.page },
    );
    const page = response.data?.Page;
    let results = (page?.media ?? []).map(mapMedia).filter((media) => !media.adult);
    if (filters.yearFrom) results = results.filter((media) => (media.releaseYear ?? 0) >= filters.yearFrom!);
    if (filters.yearTo) results = results.filter((media) => (media.releaseYear ?? 9999) <= filters.yearTo!);
    if (filters.genre) results = results.filter((media) => media.genres.some((genre) => genre.toLocaleLowerCase().includes(filters.genre!.toLocaleLowerCase())));
    return {
      provider: this.source,
      page: page?.pageInfo.currentPage ?? filters.page,
      totalPages: page?.pageInfo.lastPage ?? 1,
      results,
    };
  }

  async details(externalId: string): Promise<CatalogMedia> {
    const response = await this.query(`query Detail($id: Int!) { Media(id: $id, type: ANIME) { ${fields} } }`, {
      id: Number(externalId),
    });
    const media = response.data?.Media;
    if (!media) throw new Error("CATALOG_ITEM_NOT_FOUND");
    return mapMedia(media);
  }
}
