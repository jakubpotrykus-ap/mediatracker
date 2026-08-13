import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  APP_NAME: z.string().trim().min(1).max(60).default("MediaTracker"),
  APP_URL: z.url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(32),
  DATABASE_URL: z.string().min(1),
  ALLOW_REGISTRATION: z.enum(["true", "false"]).default("true"),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  TMDB_API_TOKEN: z.string().optional(),
  TMDB_API_BASE_URL: z.url().default("https://api.themoviedb.org/3"),
  ANILIST_ENABLED: z.enum(["true", "false"]).default("false"),
  ANILIST_TERMS_ACCEPTED: z.enum(["true", "false"]).default("false"),
  ANILIST_API_URL: z.url().default("https://graphql.anilist.co"),
  CATALOG_TEST_MODE: z.enum(["true", "false"]).default("false"),
  CATALOG_TIMEOUT_MS: z.coerce.number().int().min(500).max(20_000).default(6_000),
  CATALOG_CACHE_TTL_SECONDS: z.coerce.number().int().min(60).default(900),
  METADATA_STALE_DAYS: z.coerce.number().int().min(1).default(30),
});

export const env = serverSchema.parse(process.env);

if (process.env.NODE_ENV === "production" && (env.AUTH_SECRET.startsWith("replace-") || env.DATABASE_URL.includes("replace-with"))) {
  throw new Error("Production secrets still contain placeholder values");
}
if (process.env.NODE_ENV === "production" && env.CATALOG_TEST_MODE === "true") {
  throw new Error("CATALOG_TEST_MODE cannot be enabled in production");
}

export const appConfig = {
  name: env.APP_NAME,
  url: env.APP_URL,
  registrationEnabled: env.ALLOW_REGISTRATION === "true",
  catalogTimeoutMs: env.CATALOG_TIMEOUT_MS,
  catalogCacheTtlSeconds: env.CATALOG_CACHE_TTL_SECONDS,
  metadataStaleDays: env.METADATA_STALE_DAYS,
  trustProxy: env.TRUST_PROXY === "true",
} as const;
