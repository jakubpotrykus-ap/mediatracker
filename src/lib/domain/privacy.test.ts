import { describe, expect, it } from "vitest";
import { assertOwner, publicLibraryItem, publicProfileShape } from "@/lib/domain/privacy";

describe("data separation", () => {
  it("rejects access to another owner's data", () => {
    expect(() => assertOwner("user-b", "user-a")).toThrow("FORBIDDEN");
  });

  it("does not expose a private profile", () => {
    expect(
      publicProfileShape({
        username: "private",
        displayName: null,
        bio: null,
        email: "secret@example.com",
        settings: { profilePublic: false, showStats: true, showLibrary: true },
      }),
    ).toBeNull();
  });

  it("never exposes email in the public shape", () => {
    const result = publicProfileShape({
      username: "public",
      displayName: "Public",
      bio: "Hello",
      email: "secret@example.com",
      settings: { profilePublic: true, showStats: true, showLibrary: false },
    });
    expect(result).not.toHaveProperty("email");
  });

  it("never exposes private labels in a public library item", () => {
    const result = publicLibraryItem({
      id: "entry",
      status: "WATCHING",
      labels: [{ name: "private" }],
      media: {
        id: "media",
        format: "MOVIE",
        category: "GENERAL",
        titlePl: "Film",
        titleEn: "Movie",
        titleOriginal: "Movie",
        posterUrl: null,
        releaseYear: 2026,
      },
    });
    expect(result).not.toHaveProperty("labels");
  });
});
