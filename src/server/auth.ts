import "server-only";
import { verify } from "@node-rs/argon2";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { env } from "@/config";
import { normalizeIdentity } from "@/lib/utils";
import { db } from "@/server/db";
import { enforceRateLimit, rateLimitKey } from "@/server/security/rate-limit";
import { loginSchema } from "@/server/validation";

const useSecureCookies = new URL(env.APP_URL).protocol === "https:";

export const authOptions: NextAuthOptions = {
  secret: env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  jwt: { maxAge: 60 * 60 * 24 * 7 },
  useSecureCookies,
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        identifier: { label: "identifier", type: "text" },
        password: { label: "password", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const normalized = normalizeIdentity(parsed.data.identifier);
        const ip = env.TRUST_PROXY === "true" ? (request.headers?.["x-forwarded-for"] ?? "proxy") : "direct";
        await enforceRateLimit(rateLimitKey("login", `${ip}:${normalized}`), 8, 15 * 60_000);
        const user = await db.user.findFirst({
          where: { OR: [{ usernameNormalized: normalized }, { emailNormalized: normalized }] },
        });
        if (!user || !(await verify(user.passwordHash, parsed.data.password))) return null;
        return {
          id: user.id,
          name: user.displayName ?? user.username,
          email: user.email,
          username: user.username,
          passwordVersion: user.passwordVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.username = user.username;
        token.passwordVersion = user.passwordVersion;
      }
      if (!token.sub) return token;
      const current = await db.user.findUnique({
        where: { id: token.sub },
        select: { username: true, passwordVersion: true },
      });
      if (!current || current.passwordVersion !== token.passwordVersion) token.invalid = true;
      else token.username = current.username;
      return token;
    },
    session({ session, token }) {
      if (!token.sub || token.invalid) return { ...session, user: undefined };
      session.user = { ...session.user, id: token.sub, username: token.username };
      return session;
    },
  },
  cookies: {
    sessionToken: {
      name: useSecureCookies ? "__Secure-mediatracker.session" : "mediatracker.session",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
};
