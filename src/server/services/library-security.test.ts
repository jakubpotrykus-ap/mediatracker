import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/db", () => ({
  db: { userMediaEntry: { findFirst } },
}));

import { getLibraryEntry, updateLibraryEntry } from "@/server/services/library";

describe("server-side library ownership", () => {
  beforeEach(() => findFirst.mockReset().mockResolvedValue(null));

  it("user A cannot read a private entry belonging to user B", async () => {
    await expect(getLibraryEntry("user-a", "entry-b")).rejects.toThrow("NOT_FOUND");
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "entry-b", userId: "user-a" } }));
  });

  it("user A cannot edit an entry belonging to user B", async () => {
    await expect(updateLibraryEntry("user-a", "entry-b", { status: "COMPLETED" })).rejects.toThrow("NOT_FOUND");
    expect(findFirst).toHaveBeenCalledWith({ where: { id: "entry-b", userId: "user-a" }, select: { id: true } });
  });
});
