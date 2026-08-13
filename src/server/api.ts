import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { RateLimitError } from "@/server/security/rate-limit";

const statusByMessage: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_ORIGIN: 403,
  RATE_LIMITED: 429,
  CATALOG_PROVIDER_DISABLED: 503,
  CATALOG_UNAVAILABLE: 503,
  TMDB_NOT_CONFIGURED: 503,
  CATALOG_ITEM_NOT_FOUND: 404,
  ADULT_CONTENT_HIDDEN: 403,
  DURATION_REQUIRED: 400,
  SEASONS_REQUIRED: 400,
  NOT_A_MOVIE: 400,
  NOT_A_SERIES: 400,
  ALREADY_WATCHED: 409,
  MANUAL_MEDIA_NOT_SYNCABLE: 400,
  INVALID_PASSWORD: 400,
};

export function apiError(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  if (error instanceof RateLimitError) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

  const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
  if (message.startsWith("RATE_LIMIT:")) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  if (message.startsWith("UPSTREAM_") || message === "ANILIST_GRAPHQL_ERROR") {
    return NextResponse.json({ error: "CATALOG_UNAVAILABLE" }, { status: 503 });
  }

  const status = statusByMessage[message] ?? (message.startsWith("INVALID_") ? 400 : null);
  if (status) return NextResponse.json({ error: message }, { status });

  console.error("Unhandled API error", { type: error instanceof Error ? error.constructor.name : typeof error });
  return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
}

export async function jsonBody(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new Error("INVALID_CONTENT_TYPE");
  return request.json();
}
