import { NextResponse } from "next/server";
import { z } from "zod";
import { MediaCategory, MediaFormat } from "@/generated/prisma/enums";
import { apiError, jsonBody } from "@/server/api";
import { requireApiUser } from "@/server/current-user";
import { assertSameOrigin } from "@/server/security/request";
import { addManualMediaToLibrary } from "@/server/services/media";

const schema = z.object({
  title: z.string().trim().min(1).max(300).regex(/^[^<>]*$/),
  format: z.enum(MediaFormat),
  category: z.enum(MediaCategory),
  releaseYear: z.number().int().min(1880).max(2200).optional(),
  genres: z.array(z.string().trim().min(1).max(100).regex(/^[^<>]*$/)).max(20).default([]),
  runtimeMinutes: z.number().int().min(1).max(100_000).optional(),
  seasons: z
    .array(
      z.object({
        number: z.number().int().min(0).max(10_000),
        name: z.string().trim().max(200).regex(/^[^<>]*$/).optional(),
        episodeCount: z.number().int().min(0).max(100_000).optional(),
        durationMinutes: z.number().int().min(1).max(100_000),
      }),
    )
    .max(1_000)
    .default([]),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireApiUser();
    return NextResponse.json(await addManualMediaToLibrary(userId, schema.parse(await jsonBody(request))), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
