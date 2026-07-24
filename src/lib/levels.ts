export type DnjLevel = {
  name: string;
  minPoints: number;
  nextPoints: number | null;
};

export const DNJ_LEVELS: readonly DnjLevel[] = [
  { name: "Iniciante", minPoints: 0, nextPoints: 100 },
  { name: "Peregrino", minPoints: 100, nextPoints: 200 },
  { name: "Discípulo", minPoints: 200, nextPoints: 350 },
  { name: "Missionário", minPoints: 350, nextPoints: 550 },
  { name: "Construtor", minPoints: 550, nextPoints: 800 },
  { name: "Reconstrutor", minPoints: 800, nextPoints: null },
];

export function getDnjLevel(points: number) {
  const level = [...DNJ_LEVELS].reverse().find((item) => points >= item.minPoints) ?? DNJ_LEVELS[0];
  const span = level.nextPoints ? level.nextPoints - level.minPoints : 1;
  return {
    ...level,
    progress: level.nextPoints ? Math.min(100, ((points - level.minPoints) / span) * 100) : 100,
    pointsToNext: level.nextPoints ? Math.max(0, level.nextPoints - points) : 0,
  };
}
