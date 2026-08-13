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

type TmdbSearchItem = {
  id: number;
  media_type?: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genre_ids?: number[];
  adult?: boolean;
  original_language?: string;
};

type TmdbPage = { page: number; total_pages: number; results: TmdbSearchItem[] };
type TmdbGenre = { id: number; name: string };
type TmdbSeason = { id: number; season_number: number; name: string; episode_count: number };
type TmdbDetails = TmdbSearchItem & {
  runtime?: number;
  episode_run_time?: number[];
  number_of_episodes?: number;
  genres: TmdbGenre[];
  seasons?: TmdbSeason[];
};

function image(path?: string | null, size = "w500") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

function year(value?: string) {
  const parsed = value ? Number(value.slice(0, 4)) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function mediaType(item: TmdbSearchItem, typeHint?: CatalogSearchFilters["type"]) {
  if (typeHint === "SERIES") return MediaFormat.SERIES;
  if (typeHint === "MOVIE") return MediaFormat.MOVIE;
  return item.media_type === "tv" ? MediaFormat.SERIES : MediaFormat.MOVIE;
}

function category(item: TmdbSearchItem) {
  return item.original_language === "ja" && item.genre_ids?.includes(16) ? MediaCategory.ANIME : MediaCategory.GENERAL;
}

function searchTitle(item: TmdbSearchItem) {
  return item.title ?? item.name ?? item.original_title ?? item.original_name ?? "Untitled";
}

export class TmdbProvider implements CatalogProvider {
  readonly source = CatalogSource.TMDB;
  readonly enabled = Boolean(env.TMDB_API_TOKEN);

  private async request<T>(path: string, params: Record<string, string>) {
    if (!env.TMDB_API_TOKEN) throw new CatalogUnavailableError(this.source, "TMDB_NOT_CONFIGURED");
    const url = new URL(`${env.TMDB_API_BASE_URL}${path}`);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await catalogFetch(url.toString(), {
      headers: { Authorization: `Bearer ${env.TMDB_API_TOKEN}` },
    });
    return (await response.json()) as T;
  }

  async search(filters: CatalogSearchFilters): Promise<CatalogPage> {
    const endpoint = filters.type === "MOVIE" ? "/search/movie" : filters.type === "SERIES" ? "/search/tv" : "/search/multi";
    const common = {
      query: filters.query,
      page: String(filters.page),
      include_adult: "false",
    };
    const genrePaths = filters.type === "MOVIE" ? ["movie"] : filters.type === "SERIES" ? ["tv"] : ["movie", "tv"];
    const [pl, en, ...genreResponses] = await Promise.all([
      this.request<TmdbPage>(endpoint, { ...common, language: "pl-PL" }),
      this.request<TmdbPage>(endpoint, { ...common, language: "en-US" }),
      ...genrePaths.map((kind) => this.request<{ genres: TmdbGenre[] }>(`/genre/${kind}/list`, { language: "pl-PL" })),
    ]);
    const genres = new Map(genreResponses.flatMap((response) => response.genres).map((item) => [item.id, item.name]));
    const english = new Map(en.results.map((item) => [`${item.media_type}:${item.id}`, item]));
    let results = pl.results
      .filter((item) => item.media_type !== "person" && !item.adult)
      .map((item): CatalogMedia => {
        const enItem = english.get(`${item.media_type}:${item.id}`);
        const date = item.release_date ?? item.first_air_date ?? null;
        return {
          provider: this.source,
          externalId: String(item.id),
          format: mediaType(item, filters.type),
          category: category(item),
          titlePl: searchTitle(item),
          titleEn: enItem ? searchTitle(enItem) : null,
          titleOriginal: item.original_title ?? item.original_name ?? searchTitle(item),
          descriptionPl: item.overview || null,
          descriptionEn: enItem?.overview || null,
          releaseDate: date,
          releaseYear: year(date ?? undefined),
          posterUrl: image(item.poster_path),
          backdropUrl: image(item.backdrop_path, "w1280"),
          genres: (item.genre_ids ?? []).map((id) => genres.get(id) ?? String(id)),
          runtimeSource: DurationSource.UNKNOWN,
          adult: Boolean(item.adult),
          seasons: [],
        };
      });
    if (filters.type === "ANIME") results = results.filter((item) => item.category === MediaCategory.ANIME);
    if (filters.yearFrom) results = results.filter((item) => (item.releaseYear ?? 0) >= filters.yearFrom!);
    if (filters.yearTo) results = results.filter((item) => (item.releaseYear ?? 9999) <= filters.yearTo!);
    if (filters.genre) results = results.filter((item) => item.genres.some((genre) => genre.toLocaleLowerCase().includes(filters.genre!.toLocaleLowerCase())));
    return { provider: this.source, page: pl.page, totalPages: Math.min(pl.total_pages, 500), results };
  }

  async details(externalId: string, formatHint: MediaFormat = MediaFormat.MOVIE): Promise<CatalogMedia> {
    const kind = formatHint === MediaFormat.SERIES ? "tv" : "movie";
    const [pl, en] = await Promise.all([
      this.request<TmdbDetails>(`/${kind}/${encodeURIComponent(externalId)}`, { language: "pl-PL" }),
      this.request<TmdbDetails>(`/${kind}/${encodeURIComponent(externalId)}`, { language: "en-US" }),
    ]);
    const date = pl.release_date ?? pl.first_air_date ?? null;
    const averageEpisode = pl.episode_run_time?.find((value) => value > 0) ?? null;
    return {
      provider: this.source,
      externalId,
      format: formatHint,
      category: pl.original_language === "ja" && pl.genres.some((genre) => genre.id === 16) ? MediaCategory.ANIME : MediaCategory.GENERAL,
      titlePl: searchTitle(pl),
      titleEn: searchTitle(en),
      titleOriginal: pl.original_title ?? pl.original_name ?? searchTitle(pl),
      descriptionPl: pl.overview || null,
      descriptionEn: en.overview || null,
      releaseDate: date,
      releaseYear: year(date ?? undefined),
      posterUrl: image(pl.poster_path),
      backdropUrl: image(pl.backdrop_path, "w1280"),
      genres: pl.genres.map((genre) => genre.name),
      runtimeMinutes: pl.runtime ?? null,
      runtimeSource: pl.runtime ? DurationSource.EXACT : DurationSource.UNKNOWN,
      averageEpisodeMinutes: averageEpisode,
      adult: Boolean(pl.adult),
      seasons: (pl.seasons ?? []).map((season) => ({
        number: season.season_number,
        name: season.name,
        episodeCount: season.episode_count,
        durationMinutes: averageEpisode ? season.episode_count * averageEpisode : null,
        durationSource: averageEpisode ? DurationSource.ESTIMATED : DurationSource.UNKNOWN,
        isSpecial: season.season_number === 0,
        externalId: String(season.id),
      })),
    };
  }
}
