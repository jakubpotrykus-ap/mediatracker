import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/server/db";

export class RateLimitError extends Error {
  constructor() {
    super("RATE_LIMITED");
  }
}

export function rateLimitKey(scope: string, identity: string) {
  return createHash("sha256").update(`${scope}:${identity}`).digest("hex");
}

export async function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const now = new Date();
  await db.$transaction(async (tx) => {
    const bucket = await tx.rateLimitBucket.findUnique({ where: { key } });
    if (!bucket) {
      await tx.rateLimitBucket.create({ data: { key, windowStart: now } });
      return;
    }
    if (now.getTime() - bucket.windowStart.getTime() >= windowMs) {
      await tx.rateLimitBucket.update({ where: { key }, data: { count: 1, windowStart: now } });
      return;
    }
    if (bucket.count >= limit) throw new RateLimitError();
    await tx.rateLimitBucket.update({ where: { key }, data: { count: { increment: 1 } } });
  });
}
