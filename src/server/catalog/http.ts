import { appConfig } from "@/config";

export async function catalogFetch(input: string, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    signal: AbortSignal.timeout(appConfig.catalogTimeoutMs),
    headers: { Accept: "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (response.status === 429) throw new Error(`RATE_LIMIT:${response.headers.get("retry-after") ?? "unknown"}`);
  if (!response.ok) throw new Error(`UPSTREAM_${response.status}`);
  return response;
}
