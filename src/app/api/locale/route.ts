import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, jsonBody } from "@/server/api";
import { assertSameOrigin } from "@/server/security/request";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { locale } = z.object({ locale: z.enum(["pl", "en"]) }).parse(await jsonBody(request));
    const response = NextResponse.json({ ok: true });
    response.cookies.set("locale", locale, { httpOnly: false, sameSite: "lax", maxAge: 31_536_000, path: "/" });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
