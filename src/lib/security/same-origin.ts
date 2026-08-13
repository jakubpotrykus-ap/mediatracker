function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

export function isSameOriginRequest(request: Request, trustProxy: boolean) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  let actual: URL;
  try {
    actual = new URL(origin);
  } catch {
    return false;
  }

  const requestUrl = new URL(request.url);
  const directHost = request.headers.get("host") ?? requestUrl.host;
  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  const forwardedProtocol = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  const expectedHost = trustProxy && forwardedHost ? forwardedHost : directHost;
  const expectedProtocol = trustProxy && forwardedProtocol ? `${forwardedProtocol}:` : requestUrl.protocol;

  return actual.host === expectedHost && actual.protocol === expectedProtocol;
}
