import { NextResponse } from "next/server";
import { normalizeIdentity } from "@/lib/utils";
import { apiError } from "@/server/api";
import { db } from "@/server/db";
import { getLibrary } from "@/server/services/library";
import { getUserStats } from "@/server/services/stats";
import { publicLibraryItem } from "@/lib/domain/privacy";

type Context = { params: Promise<{ username: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const user = await db.user.findUnique({
      where: { usernameNormalized: normalizeIdentity((await context.params).username) },
      include: { settings: true },
    });
    if (!user?.settings?.profilePublic) return NextResponse.json({ error: "PROFILE_PRIVATE" }, { status: 404 });
    const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "pl";
    return NextResponse.json({
      profile: { username: user.username, displayName: user.displayName, bio: user.bio },
      stats: user.settings.showStats ? await getUserStats(user.id, locale) : null,
      library: user.settings.showLibrary
        ? (await getLibrary(user.id)).map(publicLibraryItem)
        : null,
    });
  } catch (error) {
    return apiError(error);
  }
}
