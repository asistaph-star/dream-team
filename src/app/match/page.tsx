"use client";

import { GameViewport } from "@/components/layout/GameViewport";
import { GameStage } from "@/components/layout/GameStage";
import { MatchStage } from "@/components/match/MatchStage";

export default function MatchPage() {
  return (
    <GameViewport baseWidth={1536} baseHeight={864}>
      <GameStage>
        <MatchStage />
      </GameStage>
    </GameViewport>
  );
}
