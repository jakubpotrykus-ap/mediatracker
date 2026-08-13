export type PublicProfileSource = {
  username: string;
  displayName: string | null;
  bio: string | null;
  email?: string | null;
  settings: { profilePublic: boolean; showStats: boolean; showLibrary: boolean };
};

export function publicProfileShape(profile: PublicProfileSource) {
  if (!profile.settings.profilePublic) return null;
  return {
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio,
    showStats: profile.settings.showStats,
    showLibrary: profile.settings.showLibrary,
  };
}

export function assertOwner(ownerId: string, actorId: string) {
  if (ownerId !== actorId) throw new Error("FORBIDDEN");
}

export function publicLibraryItem(entry: {
  id: string;
  status: string;
  labels?: unknown;
  media: {
    id: string;
    format: string;
    category: string;
    titlePl: string | null;
    titleEn: string | null;
    titleOriginal: string;
    posterUrl: string | null;
    releaseYear: number | null;
  };
}) {
  return {
    id: entry.id,
    status: entry.status,
    media: {
      id: entry.media.id,
      format: entry.media.format,
      category: entry.media.category,
      titlePl: entry.media.titlePl,
      titleEn: entry.media.titleEn,
      titleOriginal: entry.media.titleOriginal,
      posterUrl: entry.media.posterUrl,
      releaseYear: entry.media.releaseYear,
    },
  };
}
