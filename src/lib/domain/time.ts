export function formatWatchTime(minutes: number, locale: "pl" | "en" = "pl") {
  const safeMinutes = Math.max(0, Math.round(minutes));
  if (safeMinutes < 60) return locale === "pl" ? `${safeMinutes} min` : `${safeMinutes} min`;
  const hours = Math.floor(safeMinutes / 60);
  if (hours < 48) return locale === "pl" ? `${hours} godz.` : `${hours} hr`;
  const days = Math.floor(hours / 24);
  const remainder = hours % 24;
  return locale === "pl" ? `${days} dni ${remainder} godz.` : `${days} d ${remainder} hr`;
}

export function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
