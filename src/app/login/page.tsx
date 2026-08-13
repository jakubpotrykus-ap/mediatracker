import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { appConfig } from "@/config";
import { currentUser } from "@/server/current-user";

export default async function LoginPage() {
  if (await currentUser()) redirect("/dashboard");
  const t = await getTranslations("auth");
  return <main className="mx-auto min-h-dvh max-w-md px-5 py-8"><header className="flex items-center justify-between"><Link href="/" className="font-black"><span className="accent">●</span> {appConfig.name}</Link><LanguageSwitcher /></header><h1 className="mb-7 mt-20 text-3xl font-black">{t("loginTitle")}</h1><AuthForm mode="login" /></main>;
}
