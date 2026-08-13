import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "@/lib/security/same-origin";

describe("same-origin request validation", () => {
  it("accepts the host actually used for a direct local request", () => {
    const request = new Request("http://127.0.0.1:3000/api/register", {
      headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
    });

    expect(isSameOriginRequest(request, false)).toBe(true);
  });

  it("rejects a foreign origin", () => {
    const request = new Request("http://localhost:3000/api/register", {
      headers: { host: "localhost:3000", origin: "https://evil.example" },
    });

    expect(isSameOriginRequest(request, false)).toBe(false);
  });

  it("uses forwarded host and protocol only behind a trusted proxy", () => {
    const request = new Request("http://app:3000/api/register", {
      headers: {
        host: "app:3000",
        origin: "https://media.example.com",
        "x-forwarded-host": "media.example.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(isSameOriginRequest(request, true)).toBe(true);
    expect(isSameOriginRequest(request, false)).toBe(false);
  });

  it("rejects malformed origins", () => {
    const request = new Request("http://localhost:3000/api/register", {
      headers: { host: "localhost:3000", origin: "not-a-url" },
    });

    expect(isSameOriginRequest(request, false)).toBe(false);
  });
});
