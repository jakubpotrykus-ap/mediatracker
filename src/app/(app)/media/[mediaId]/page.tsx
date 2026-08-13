import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/current-user";
import { db } from "@/server/db";

export default async function MediaPage({ params }: { params: Promise<{ mediaId: string }> }) {
  const user = await requireUser();
  const entry = await db.userMediaEntry.findFirst({ where: { userId: user.id, mediaId: (await params).mediaId }, select: { id: true } });
  if (!entry) notFound();
  redirect(`/library/${entry.id}`);
}
