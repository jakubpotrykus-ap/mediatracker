import { getLocale, getTranslations } from "next-intl/server";
import { ProfileView } from "@/components/profile-view";
import { normalizeIdentity } from "@/lib/utils";
import { db } from "@/server/db";
import { getLibrary } from "@/server/services/library";
import { getUserStats } from "@/server/services/stats";

export const dynamic = "force-dynamic";
export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const user = await db.user.findUnique({ where: { usernameNormalized: normalizeIdentity((await params).username) }, include: { settings: true } });
  const t = await getTranslations("profile");
  if (!user?.settings?.profilePublic) return <main className="grid min-h-dvh place-items-center p-5"><div className="card max-w-md p-8 text-center"><h1 className="text-2xl font-black">{t("private")}</h1><p className="muted mt-3">{t("privateText")}</p></div></main>;
  const locale = (await getLocale()) as "pl" | "en";
  return <ProfileView profile={{ username: user.username, displayName: user.displayName, bio: user.bio }} stats={user.settings.showStats ? await getUserStats(user.id, locale) : null} library={user.settings.showLibrary ? await getLibrary(user.id) : null} />;
}
