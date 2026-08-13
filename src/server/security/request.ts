import "server-only";
import { appConfig } from "@/config";
import { isSameOriginRequest } from "@/lib/security/same-origin";

export function requestIdentity(request: Request) {
  if (!appConfig.trustProxy) return "direct";
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "proxy";
}

export function assertSameOrigin(request: Request) {
  if (!isSameOriginRequest(request, appConfig.trustProxy)) throw new Error("INVALID_ORIGIN");
}
