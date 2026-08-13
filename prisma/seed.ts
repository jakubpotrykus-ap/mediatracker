import "dotenv/config";
import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { CatalogSource, DurationSource, MediaCategory, MediaFormat, PrismaClient } from "../src/generated/prisma/client";

if (process.env.NODE_ENV === "production") throw new Error("Development seed is disabled in production");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const passwordHash = await hash("DemoPassword123!", { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 });

for (const username of ["demo", "demo2"]) {
  await db.user.upsert({
    where: { usernameNormalized: username },
    create: {
      username,
      usernameNormalized: username,
      passwordHash,
      displayName: username === "demo" ? "Demo" : "Demo 2",
      settings: { create: {} },
    },
    update: {},
  });
}

const user = await db.user.findUniqueOrThrow({ where: { usernameNormalized: "demo" } });
const movie = await db.mediaItem.upsert({
  where: { id: "dev-seed-movie" },
  create: {
    id: "dev-seed-movie",
    format: MediaFormat.MOVIE,
    category: MediaCategory.GENERAL,
    source: CatalogSource.TEST,
    titlePl: "Przykładowy film",
    titleEn: "Example Movie",
    titleOriginal: "Example Movie",
    releaseYear: 2025,
    runtimeMinutes: 105,
    runtimeSource: DurationSource.EXACT,
  },
  update: {},
});
await db.userMediaEntry.upsert({
  where: { userId_mediaId: { userId: user.id, mediaId: movie.id } },
  create: { userId: user.id, mediaId: movie.id },
  update: {},
});

await db.$disconnect();
