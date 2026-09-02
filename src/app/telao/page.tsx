import { LiveRankingDisplay } from "@/features/display/live-ranking-display";

export default async function TelaoPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  return <LiveRankingDisplay target="screen" screenFormat={tipo === "fundo" ? "backdrop" : "side"} />;
}
