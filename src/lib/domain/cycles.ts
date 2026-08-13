export type SeasonDefinition = {
  id: string;
  number: number;
  name?: string | null;
  episodeCount?: number | null;
  durationMinutes?: number | null;
  durationSource: "EXACT" | "ESTIMATED" | "MANUAL" | "UNKNOWN";
  isSpecial?: boolean;
};

export type CycleSeasonSnapshot = {
  seasonId: string;
  seasonNumberSnapshot: number;
  seasonNameSnapshot?: string | null;
  episodeCountSnapshot?: number | null;
  durationMinutesSnapshot?: number | null;
  durationSourceSnapshot: SeasonDefinition["durationSource"];
  required: boolean;
};

export function createCycleSnapshot(
  seasons: readonly SeasonDefinition[],
  includeSpecials = false,
): CycleSeasonSnapshot[] {
  return seasons
    .filter((season) => includeSpecials || !season.isSpecial)
    .sort((a, b) => a.number - b.number)
    .map((season) => ({
      seasonId: season.id,
      seasonNumberSnapshot: season.number,
      seasonNameSnapshot: season.name,
      episodeCountSnapshot: season.episodeCount,
      durationMinutesSnapshot: season.durationMinutes,
      durationSourceSnapshot: season.durationSource,
      required: !season.isSpecial || includeSpecials,
    }));
}

export function isCycleComplete(
  snapshots: readonly Pick<CycleSeasonSnapshot, "seasonNumberSnapshot" | "required">[],
  completedSeasonNumbers: ReadonlySet<number>,
) {
  const required = snapshots.filter((season) => season.required);
  return required.length > 0 && required.every((season) => completedSeasonNumbers.has(season.seasonNumberSnapshot));
}
