import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return <main className="grid min-h-dvh place-items-center p-6"><div className="card max-w-md p-8 text-center"><p className="accent text-6xl font-black">404</p><h1 className="mt-5 text-2xl font-bold">{t("title")}</h1><p className="muted mt-3">{t("text")}</p><Link href="/" className="btn btn-primary mt-6">{t("home")}</Link></div></main>;
}
