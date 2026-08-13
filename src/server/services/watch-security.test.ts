import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, upsert } = vi.hoisted(() => ({ findFirst: vi.fn(), upsert: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/db", () => ({
  db: {
    userMediaEntry: { findFirst },
    userSeasonDurationOverride: { upsert },
  },
}));

import { setSeasonDuration } from "@/server/services/watches";

describe("private season duration overrides", () => {
  beforeEach(() => {
    findFirst.mockReset();
    upsert.mockReset().mockResolvedValue({});
  });

  it("stores a correction for only the authenticated user", async () => {
    findFirst.mockResolvedValue({
      id: "entry-a",
      userId: "user-a",
      media: {
        format: "SERIES",
        seasons: [
          {
            id: "season-1",
            durationMinutes: null,
            durationSource: "UNKNOWN",
            userDurationOverrides: [],
          },
        ],
      },
    });

    await setSeasonDuration("user-a", "entry-a", "season-1", 640);

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "entry-a", userId: "user-a" } }));
    expect(upsert).toHaveBeenCalledWith({
      where: { userId_seasonId: { userId: "user-a", seasonId: "season-1" } },
      create: { userId: "user-a", seasonId: "season-1", durationMinutes: 640 },
      update: { durationMinutes: 640 },
    });
  });

  it("cannot correct a season through another user's library entry", async () => {
    findFirst.mockResolvedValue(null);
    await expect(setSeasonDuration("user-a", "entry-b", "season-1", 640)).rejects.toThrow("NOT_FOUND");
    expect(upsert).not.toHaveBeenCalled();
  });
});
