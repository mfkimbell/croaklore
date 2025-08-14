"use client";

import Board3D from "@/components/Board3D";
import { BOARD_CONFIG } from "@/game/config";
import { useEffect } from "react";
import { useGameStore, DemoUnits } from "@/game/store";

export default function Home() {
  const init = useGameStore((s) => s.init);
  const addUnit = useGameStore((s) => s.addUnit);
  const state = useGameStore((s) => s.state);

  useEffect(() => {
    if (!state) {
      init(BOARD_CONFIG.width, BOARD_CONFIG.height, ["p1", "p2"]);
      // Demo units placed on tiles
      addUnit("p1", DemoUnits.Soldier("u1"), "u1", { x: 3, y: 3 });
      addUnit("p2", DemoUnits.Archer("u2"), "u2", { x: 6, y: 6 });
    }
  }, [state, init, addUnit]);

  return (
    <main style={{ width: "100vw", height: "100vh", padding: 0, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 12, left: 12, zIndex: 10, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Croaklore Demo Board</h1>
      </div>
      <Board3D cellSize={1} />
      <div
        style={{
          position: "fixed",
          left: 12,
          bottom: 12,
          display: "flex",
          gap: 8,
          backgroundColor: "rgba(0,0,0,0.18)",
          color: "#fff",
          padding: 8,
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.15)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: 1000,
          pointerEvents: "auto",
        }}
      >
        <button
          onClick={() => useGameStore.getState().undo()}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.25)",
            color: "#fff",
            padding: "6px 10px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Undo
        </button>
        <button
          onClick={() => useGameStore.getState().redo()}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.25)",
            color: "#fff",
            padding: "6px 10px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Redo
        </button>
      </div>
    </main>
  );
}
