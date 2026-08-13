import { NextResponse } from "next/server";
import { apiError, jsonBody } from "@/server/api";
import { requireApiUser } from "@/server/current-user";
import { assertSameOrigin } from "@/server/security/request";
import { deleteLabel, updateLabel } from "@/server/services/labels";
import { labelSchema } from "@/server/validation";

type Context = { params: Promise<{ labelId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const userId = await requireApiUser();
    return NextResponse.json(await updateLabel(userId, (await context.params).labelId, labelSchema.partial().parse(await jsonBody(request))));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    await deleteLabel(await requireApiUser(), (await context.params).labelId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
