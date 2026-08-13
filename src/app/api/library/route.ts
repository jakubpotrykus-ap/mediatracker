import { NextResponse } from "next/server";
import { z } from "zod";
import { CatalogSource, LibraryStatus, MediaFormat } from "@/generated/prisma/enums";
import { apiError, jsonBody } from "@/server/api";
import { requireApiUser } from "@/server/current-user";
import { getLibrary } from "@/server/services/library";
import { addCatalogMediaToLibrary } from "@/server/services/media";
import { assertSameOrigin } from "@/server/security/request";

const addSchema = z.object({
  provider: z.enum(CatalogSource),
  externalId: z.string().min(1).max(100),
  formatHint: z.enum(MediaFormat).optional(),
  status: z.enum(LibraryStatus).optional(),
});

const optionalString = (max: number) => z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.string().trim().max(max).optional(),
);
const optionalNumber = (min: number, max: number) => z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().int().min(min).max(max).optional(),
);
const libraryFilterSchema = z.object({
  query: optionalString(120),
  status: z.preprocess((value) => value === "" ? undefined : value, z.enum(LibraryStatus).optional()),
  labelId: z.preprocess((value) => value === "" ? undefined : value, z.string().cuid().optional()),
  type: z.preprocess((value) => value === "" ? undefined : value, z.enum(["ALL", "MOVIE", "SERIES", "ANIME"]).optional()),
  genre: optionalString(80),
  yearFrom: optionalNumber(1880, 2200),
  yearTo: optionalNumber(1880, 2200),
  minWatches: optionalNumber(0, 10_000),
  activitySince: z.preprocess((value) => value === "" ? undefined : value, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  sort: z.preprocess((value) => value === "" ? undefined : value, z.enum(["activity", "added", "title"]).optional()),
}).refine((value) => !value.yearFrom || !value.yearTo || value.yearFrom <= value.yearTo, { message: "INVALID_YEAR_RANGE" });

export async function GET(request: Request) {
  try {
    const userId = await requireApiUser();
    const input = libraryFilterSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const activitySinceRaw = input.activitySince;
    const activitySince = activitySinceRaw ? new Date(`${activitySinceRaw}T00:00:00.000Z`) : undefined;
    return NextResponse.json(
      await getLibrary(userId, {
        query: input.query,
        status: input.status,
        labelId: input.labelId,
        type: input.type,
        genre: input.genre,
        yearFrom: input.yearFrom,
        yearTo: input.yearTo,
        minWatches: input.minWatches,
        activitySince: activitySince && !Number.isNaN(activitySince.getTime()) ? activitySince : undefined,
        sort: input.sort,
      }),
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireApiUser();
    const input = addSchema.parse(await jsonBody(request));
    return NextResponse.json(await addCatalogMediaToLibrary({ userId, ...input }), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
