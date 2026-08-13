import "server-only";
import { safeText } from "@/lib/utils";
import { db } from "@/server/db";

export async function listLabels(userId: string) {
  return db.customLabel.findMany({ where: { userId }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}

export async function createLabel(userId: string, data: { name: string; color?: string | null; sortOrder?: number }) {
  return db.customLabel.create({
    data: { userId, name: safeText(data.name).slice(0, 40), color: data.color, sortOrder: data.sortOrder ?? 0 },
  });
}

export async function updateLabel(userId: string, id: string, data: { name?: string; color?: string | null; sortOrder?: number }) {
  const label = await db.customLabel.findFirst({ where: { id, userId }, select: { id: true } });
  if (!label) throw new Error("NOT_FOUND");
  return db.customLabel.update({
    where: { id },
    data: { ...data, name: data.name ? safeText(data.name).slice(0, 40) : undefined },
  });
}

export async function deleteLabel(userId: string, id: string) {
  const label = await db.customLabel.findFirst({ where: { id, userId }, select: { id: true } });
  if (!label) throw new Error("NOT_FOUND");
  await db.customLabel.delete({ where: { id } });
}
