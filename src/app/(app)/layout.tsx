import { AppShell } from "@/components/app-shell";
import { appConfig } from "@/config";
import { requireUser } from "@/server/current-user";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <AppShell appName={appConfig.name}>{children}</AppShell>;
}
