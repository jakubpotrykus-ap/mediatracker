import { NextResponse } from "next/server";
import { apiError } from "@/server/api";
import { requireApiUser } from "@/server/current-user";
import { getUserStats } from "@/server/services/stats";

export async function GET(request: Request) {
  try {
    const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "pl";
    return NextResponse.json(await getUserStats(await requireApiUser(), locale));
  } catch (error) {
    return apiError(error);
  }
}
