import { NextResponse } from "next/server";
import { z } from "zod";
import { LibraryStatus } from "@/generated/prisma/enums";
import { apiError, jsonBody } from "@/server/api";
import { requireApiUser } from "@/server/current-user";
import { assertSameOrigin } from "@/server/security/request";
import { getLibraryEntry, removeLibraryEntry, updateLibraryEntry } from "@/server/services/library";
import { refreshMediaMetadata } from "@/server/services/media";

type Context = { params: Promise<{ entryId: string }> };
const updateSchema = z.object({ status: z.enum(LibraryStatus).optional(), labelIds: z.array(z.string().cuid()).max(30).optional() });

export async function GET(_: Request, context: Context) {
  try {
    const userId = await requireApiUser();
    return NextResponse.json(await getLibraryEntry(userId, (await context.params).entryId));
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const userId = await requireApiUser();
    const entryId = (await context.params).entryId;
    const raw = await jsonBody(request);
    if (typeof raw === "object" && raw !== null && "refreshMetadata" in raw) {
      await refreshMediaMetadata(userId, entryId);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(await updateLibraryEntry(userId, entryId, updateSchema.parse(raw)));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const userId = await requireApiUser();
    await removeLibraryEntry(userId, (await context.params).entryId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
