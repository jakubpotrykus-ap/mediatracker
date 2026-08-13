import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/api";
import { catalogStatus, searchCatalog } from "@/server/catalog";
import { requireApiUser } from "@/server/current-user";
import { enforceRateLimit, rateLimitKey } from "@/server/security/rate-limit";

const querySchema = z.object({
  query: z.string().trim().min(2).max(120),
  page: z.coerce.number().int().min(1).max(500).default(1),
  type: z.enum(["ALL", "MOVIE", "SERIES", "ANIME"]).default("ALL"),
  genre: z.string().trim().max(80).optional(),
  yearFrom: z.coerce.number().int().min(1880).max(2200).optional(),
  yearTo: z.coerce.number().int().min(1880).max(2200).optional(),
});

export async function GET(request: Request) {
  try {
    const userId = await requireApiUser();
    await enforceRateLimit(rateLimitKey("catalog", userId), 30, 60_000);
    const values = Object.fromEntries(new URL(request.url).searchParams);
    const filters = querySchema.parse(values);
    return NextResponse.json({ pages: await searchCatalog(filters), status: catalogStatus() });
  } catch (error) {
    return apiError(error);
  }
}
