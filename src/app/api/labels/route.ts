import { NextResponse } from "next/server";
import { apiError, jsonBody } from "@/server/api";
import { requireApiUser } from "@/server/current-user";
import { assertSameOrigin } from "@/server/security/request";
import { createLabel, listLabels } from "@/server/services/labels";
import { labelSchema } from "@/server/validation";

export async function GET() {
  try {
    return NextResponse.json(await listLabels(await requireApiUser()));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireApiUser();
    return NextResponse.json(await createLabel(userId, labelSchema.parse(await jsonBody(request))), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
