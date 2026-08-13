import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, jsonBody } from "@/server/api";
import { requireApiUser } from "@/server/current-user";
import { assertSameOrigin } from "@/server/security/request";
import {
  addCompletedCycles,
  addMovieWatches,
  cancelCycle,
  markSeasonWatched,
  removeMovieWatch,
  setSeasonDuration,
  startCycle,
  undoSeasonWatch,
} from "@/server/services/watches";

type Context = { params: Promise<{ entryId: string }> };
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ADD_MOVIE"), count: z.number().int().min(1).max(50), watchedDates: z.array(z.string().datetime().nullable()).max(50).optional() }),
  z.object({ action: z.literal("REMOVE_MOVIE"), eventId: z.string().cuid() }),
  z.object({ action: z.literal("START_CYCLE"), includeSpecials: z.boolean().default(false) }),
  z.object({ action: z.literal("CANCEL_CYCLE"), cycleId: z.string().cuid() }),
  z.object({ action: z.literal("MARK_SEASON"), seasonId: z.string().cuid(), cycleId: z.string().cuid().optional(), standalone: z.boolean().optional(), watchedAt: z.string().datetime().nullable().optional() }),
  z.object({ action: z.literal("UNDO_SEASON"), eventId: z.string().cuid() }),
  z.object({ action: z.literal("COMPLETE_CYCLES"), count: z.number().int().min(1).max(20) }),
  z.object({ action: z.literal("SET_SEASON_DURATION"), seasonId: z.string().cuid(), durationMinutes: z.number().int().min(1).max(100_000) }),
]);

export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const userId = await requireApiUser();
    const entryId = (await context.params).entryId;
    const input = schema.parse(await jsonBody(request));
    switch (input.action) {
      case "ADD_MOVIE":
        await addMovieWatches(userId, entryId, input);
        break;
      case "REMOVE_MOVIE":
        await removeMovieWatch(userId, input.eventId);
        break;
      case "START_CYCLE":
        return NextResponse.json(await startCycle(userId, entryId, input.includeSpecials), { status: 201 });
      case "CANCEL_CYCLE":
        await cancelCycle(userId, entryId, input.cycleId);
        break;
      case "MARK_SEASON":
        return NextResponse.json(await markSeasonWatched(userId, entryId, input), { status: 201 });
      case "UNDO_SEASON":
        await undoSeasonWatch(userId, input.eventId);
        break;
      case "COMPLETE_CYCLES":
        await addCompletedCycles(userId, entryId, input.count);
        break;
      case "SET_SEASON_DURATION":
        await setSeasonDuration(userId, entryId, input.seasonId, input.durationMinutes);
        break;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
