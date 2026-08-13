export type LocalizedMedia = {
  titlePl?: string | null;
  titleEn?: string | null;
  titleOriginal: string;
  descriptionPl?: string | null;
  descriptionEn?: string | null;
};

export function localizedTitle(media: LocalizedMedia, locale: "pl" | "en") {
  return locale === "pl"
    ? media.titlePl ?? media.titleEn ?? media.titleOriginal
    : media.titleEn ?? media.titleOriginal ?? media.titlePl ?? "";
}

export function localizedDescription(media: LocalizedMedia, locale: "pl" | "en") {
  return locale === "pl"
    ? media.descriptionPl ?? media.descriptionEn ?? ""
    : media.descriptionEn ?? media.descriptionPl ?? "";
}
