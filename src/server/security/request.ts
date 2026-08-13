import "server-only";
import { appConfig } from "@/config";

export function requestIdentity(request: Request) {
  if (!appConfig.trustProxy) return "direct";
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "proxy";
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const expected = new URL(appConfig.url);
  const actual = new URL(origin);
  if (actual.host !== expected.host || actual.protocol !== expected.protocol) throw new Error("INVALID_ORIGIN");
}
