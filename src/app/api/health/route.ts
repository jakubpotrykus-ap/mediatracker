import { NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET() {
  const startedAt = performance.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "ok", responseMs: Math.round(performance.now() - startedAt) });
  } catch {
    return NextResponse.json({ status: "degraded", database: "unavailable" }, { status: 503 });
  }
}
