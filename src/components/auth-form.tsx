"use client";

import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AuthForm({ mode, registrationEnabled = true }: { mode: "login" | "register"; registrationEnabled?: boolean }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const identifier = String(form.get(mode === "login" ? "identifier" : "username") ?? "");
    const password = String(form.get("password") ?? "");
    if (mode === "register") {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: identifier,
          email: String(form.get("email") ?? ""),
          password,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Warsaw",
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        const messageKey =
          body.error === "IDENTITY_TAKEN"
            ? "taken"
            : body.error === "INVALID_INPUT"
              ? "registrationInvalid"
              : body.error === "RATE_LIMITED"
                ? "rateLimited"
                : body.error === "REGISTRATION_DISABLED"
                  ? "registrationDisabled"
                  : "registrationFailed";
        setError(t(messageKey));
        setPending(false);
        return;
      }
    }
    const result = await signIn("credentials", { identifier, password, redirect: false });
    if (result?.error) {
      setError(t("invalid"));
      setPending(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }
  if (mode === "register" && !registrationEnabled) return <div className="card p-6 text-center muted">{t("registrationDisabled")}</div>;
  return (
    <form className="card grid gap-5 p-6 sm:p-8" onSubmit={submit}>
      <div><label className="label" htmlFor="identity">{mode === "login" ? t("identifier") : t("username")}</label><input className="input" id="identity" name={mode === "login" ? "identifier" : "username"} autoComplete="username" minLength={3} maxLength={254} required /></div>
      {mode === "register" ? <div><label className="label" htmlFor="email">{t("email")}</label><input className="input" id="email" name="email" type="email" autoComplete="email" maxLength={254} /></div> : null}
      <div><label className="label" htmlFor="password">{t("password")}</label><input className="input" id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 10 : 1} maxLength={128} required />{mode === "register" ? <p className="muted mt-2 text-xs">{t("passwordHint")}</p> : null}</div>
      {error ? <p role="alert" className="text-sm text-[color:var(--danger)]">{error}</p> : null}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? t("processing") : mode === "login" ? t("login") : t("register")}</button>
      <p className="muted text-center text-sm">{mode === "login" ? t("noAccount") : t("hasAccount")} <Link className="accent font-bold" href={mode === "login" ? "/register" : "/login"}>{mode === "login" ? t("register") : t("login")}</Link></p>
    </form>
  );
}
