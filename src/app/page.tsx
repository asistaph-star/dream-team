"use client";

import { GameViewport } from "@/components/layout/GameViewport";
import { GameStage } from "@/components/layout/GameStage";
import { StadiumStage } from "@/components/stadium/StadiumStage";

export default function AuthenticLobby() {
  return (
    <GameViewport baseWidth={1536} baseHeight={864}>
      <GameStage>
        <StadiumStage />
      </GameStage>
    </GameViewport>
  );
}
