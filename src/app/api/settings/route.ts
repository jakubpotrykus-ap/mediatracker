import { hash, verify } from "@node-rs/argon2";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AppLocale } from "@/generated/prisma/enums";
import { safeText } from "@/lib/utils";
import { apiError, jsonBody } from "@/server/api";
import { requireApiUser } from "@/server/current-user";
import { db } from "@/server/db";
import { assertSameOrigin } from "@/server/security/request";
import { passwordSchema, timezoneSchema } from "@/server/validation";

const settingsSchema = z.object({
  displayName: z.string().trim().max(80).regex(/^[^<>]*$/).nullable().optional(),
  bio: z.string().trim().max(280).regex(/^[^<>]*$/).nullable().optional(),
  locale: z.enum(AppLocale).optional(),
  timezone: timezoneSchema.optional(),
  profilePublic: z.boolean().optional(),
  showStats: z.boolean().optional(),
  showLibrary: z.boolean().optional(),
});

const passwordChangeSchema = z.object({ action: z.literal("CHANGE_PASSWORD"), currentPassword: z.string().min(1).max(128), newPassword: passwordSchema });
const deleteSchema = z.object({ password: z.string().min(1).max(128), confirmation: z.literal("DELETE") });

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireApiUser();
    const raw = await jsonBody(request);
    const passwordChange = passwordChangeSchema.safeParse(raw);
    if (passwordChange.success) {
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user || !(await verify(user.passwordHash, passwordChange.data.currentPassword))) throw new Error("INVALID_PASSWORD");
      const passwordHash = await hash(passwordChange.data.newPassword, {
        algorithm: 2,
        memoryCost: 19_456,
        timeCost: 2,
        parallelism: 1,
      });
      await db.user.update({ where: { id: userId }, data: { passwordHash, passwordVersion: { increment: 1 } } });
      return NextResponse.json({ ok: true, sessionsRevoked: true });
    }
    const data = settingsSchema.parse(raw);
    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: {
          displayName: data.displayName === undefined ? undefined : data.displayName ? safeText(data.displayName) : null,
          bio: data.bio === undefined ? undefined : data.bio ? safeText(data.bio) : null,
        },
      }),
      db.userSettings.update({
        where: { userId },
        data: {
          locale: data.locale,
          timezone: data.timezone,
          profilePublic: data.profilePublic,
          showStats: data.showStats,
          showLibrary: data.showLibrary,
        },
      }),
    ]);
    const response = NextResponse.json({ ok: true });
    if (data.locale) response.cookies.set("locale", data.locale.toLocaleLowerCase(), { sameSite: "lax", maxAge: 31_536_000, path: "/" });
    return response;
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireApiUser();
    const input = deleteSchema.parse(await jsonBody(request));
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || !(await verify(user.passwordHash, input.password))) throw new Error("INVALID_PASSWORD");
    await db.user.delete({ where: { id: userId } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
