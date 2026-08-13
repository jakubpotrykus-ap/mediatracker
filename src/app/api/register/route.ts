import { hash } from "@node-rs/argon2";
import { NextResponse } from "next/server";
import { appConfig } from "@/config";
import { normalizeIdentity } from "@/lib/utils";
import { apiError, jsonBody } from "@/server/api";
import { db } from "@/server/db";
import { enforceRateLimit, rateLimitKey } from "@/server/security/rate-limit";
import { assertSameOrigin, requestIdentity } from "@/server/security/request";
import { registerSchema } from "@/server/validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!appConfig.registrationEnabled) return NextResponse.json({ error: "REGISTRATION_DISABLED" }, { status: 403 });
    await enforceRateLimit(rateLimitKey("register", requestIdentity(request)), 5, 60 * 60_000);
    const input = registerSchema.parse(await jsonBody(request));
    const usernameNormalized = normalizeIdentity(input.username);
    const email = input.email || null;
    const emailNormalized = email ? normalizeIdentity(email) : null;
    const exists = await db.user.findFirst({
      where: { OR: [{ usernameNormalized }, ...(emailNormalized ? [{ emailNormalized }] : [])] },
      select: { id: true },
    });
    if (exists) return NextResponse.json({ error: "IDENTITY_TAKEN" }, { status: 409 });
    const passwordHash = await hash(input.password, {
      algorithm: 2,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
      outputLen: 32,
    });
    const user = await db.user.create({
      data: {
        username: input.username,
        usernameNormalized,
        email,
        emailNormalized,
        passwordHash,
        settings: { create: { timezone: input.timezone } },
      },
      select: { id: true, username: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
