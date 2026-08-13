import { ProfileView } from "@/components/profile-view";
import { getLocale } from "next-intl/server";
import { requireUser } from "@/server/current-user";
import { getLibrary } from "@/server/services/library";
import { getUserStats } from "@/server/services/stats";

export default async function ProfilePage() {
  const user = await requireUser(); const locale = (await getLocale()) as "pl" | "en";
  return <ProfileView preview profile={{ username: user.username, displayName: user.displayName, bio: user.bio }} stats={await getUserStats(user.id, locale)} library={await getLibrary(user.id)} />;
}
