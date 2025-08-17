"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useGameStore } from "@/game/store";
import UnitModel from "@/components/UnitModel";

type BoardProps = {
    cellSize?: number;
};

import { staticModels } from '../config/staticModels';
import { RENDER_CONFIG } from '../game/config';

function StaticModels({ boardWidth, boardHeight, cellSize }: { boardWidth: number; boardHeight: number; cellSize: number }) {
    return (
        <group>
            {Object.entries(staticModels).flatMap(([groupName, group]) => (
                group.models.map((model, i) => {
                    const W = boardWidth * cellSize;
                    const H = boardHeight * cellSize;
                    const worldX = model.tileX * cellSize - W / 2 + cellSize / 2;
                    const worldZ = model.tileY * cellSize - H / 2 + cellSize / 2;
                    const fitXZSize = model.fitToTile ? (cellSize * model.fitToTile) : undefined;
                    return (
                        <group
                            key={`${groupName}-${i}`}
                            position={[worldX, model.height || 0, worldZ]}
                            scale={model.fitToTile ? 1 : model.scale}
                            rotation={[0, model.rotation, 0]}
                        >
                            <UnitModel
                                modelUrl={model.modelUrl}
                                scaleFactor={0.3}
                                fitXZSize={fitXZSize}
                            />
                        </group>
                    );
                })
            ))}
        </group>
    );
}

function Tile({ x, y, size, boardWidth, boardHeight, highlighted, onTap }: { x: number; y: number; size: number; boardWidth: number; boardHeight: number; highlighted: boolean; onTap: (x: number, y: number) => void }) {
    const W = boardWidth * size;
    const H = boardHeight * size;
    const px = x * size - W / 2 + size / 2;
    const py = y * size - H / 2 + size / 2;
    // Use x,y coordinates to generate consistent random rotation for each tile
    const randomRotation = (x * 123 + y * 456) % 360;
    // Use x,y coordinates to generate consistent random color variations
    const colorSeed = (x * 789 + y * 321) % 100;
    const hue = 120 + (colorSeed - 50) * 1.2; // More green variations (120° base)
    const saturation = 40 + (colorSeed % 50); // 40-90% saturation
    const lightness = 25 + (colorSeed % 45); // 25-70% lightness (darker overall)
    const randomColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

    // Add subtle size variation for more dynamic look
    const sizeVariation = 0.85 + (colorSeed % 30) * 0.005; // 0.85 to 1.0 scale variation

    return (
        <group position={[px, 0.05, py]} rotation={[0, (randomRotation * Math.PI) / 180, 0]} scale={sizeVariation} onPointerDown={() => onTap(x, y)}>
            <UnitModel
                modelUrl={highlighted ? "/models/lillypad1-h.glb" : "/models/lillypad1.glb"}
                scaleFactor={0.3}
                fitXZSize={size * 0.9}
                centerXZ={true}
                tintColor={highlighted ? "#5A833A" : "#4a7c59"}
            />
        </group>
    );
}

function Units({ cellSize, onUnitTap, onUnitLongPress }: { cellSize: number; onUnitTap: (unitId: string) => void; onUnitLongPress: (unitId: string) => void }) {
    // Track long press per unit for iOS — must be declared before any conditional returns
    const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const timers = timersRef.current;
    const s = useGameStore((st) => st.state);
    if (!s) return null;
    const W = s.board.width * cellSize;
    const H = s.board.height * cellSize;

    return (
        <group>
            {Object.values(s.units).map((u) => {
                const px = u.position.x * cellSize - W / 2 + cellSize / 2;
                const py = u.position.y * cellSize - H / 2 + cellSize / 2;
                const selected = s.selectedUnitId === u.id;
                const handlePointerDown = () => {
                    timers[u.id] = setTimeout(() => {
                        onUnitLongPress(u.id);
                        clearTimeout(timers[u.id]);
                        delete timers[u.id];
                    }, 300);
                };
                const handlePointerUp = () => {
                    if (timers[u.id]) {
                        clearTimeout(timers[u.id]);
                        delete timers[u.id];
                        onUnitTap(u.id);
                    }
                };
                const handlePointerOut = () => {
                    if (timers[u.id]) {
                        clearTimeout(timers[u.id]);
                        delete timers[u.id];
                    }
                };
                return (
                    <group key={u.id} position={[px, 0.025, py]} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerOut={handlePointerOut}>
                        <UnitModel modelUrl="/models/Frog.gltf" animationUrl="/models/Animations/Frog_Idle.gltf" playClip="Frog_Idle" fitXZSize={cellSize * 0.6} centerXZ={false} />

                    </group>
                );
            })}
        </group>
    );
}

export default function Board3D({ cellSize = 1 }: BoardProps) {
    const state = useGameStore((s) => s.state);
    const selectBySquare = useGameStore((s) => s.selectBySquare);
    const [menuForUnit, setMenuForUnit] = useState<string | null>(null);
    const [mode, setMode] = useState<"idle" | "move" | "attack">("idle");
    const [draggingUnitId, setDraggingUnitId] = useState<string | null>(null);
    const legalMoves = useGameStore((s) => s.legalMovesOfSelected);

    const width = state?.board.width ?? 0;
    const height = state?.board.height ?? 0;

    const selectedUnitId = state?.selectedUnitId;
    const onTileTap = useCallback((x: number, y: number) => {


        const moves = legalMoves();
        // If dragging a selected unit, try to move to tapped tile if legal
        if (draggingUnitId && selectedUnitId === draggingUnitId) {
            if (moves.find((m) => m.x === x && m.y === y)) {
                useGameStore.getState().dispatch({ kind: "move", unitId: draggingUnitId, to: { x, y } });
            }
            setDraggingUnitId(null);

            return;
        }
        // Click-to-move: if a unit is selected (and owned), move on single tap
        if (selectedUnitId && moves.find((m) => m.x === x && m.y === y)) {
            useGameStore.getState().dispatch({ kind: "move", unitId: selectedUnitId, to: { x, y } });
            setMenuForUnit(null);
            return;
        }
        // Otherwise tap selects any unit on that square (store enforces ownership)
        setMenuForUnit(null);
        setMode("idle");
        selectBySquare({ x, y });
    }, [draggingUnitId, legalMoves, selectBySquare, selectedUnitId]);

    const onUnitTap = useCallback((unitId: string) => {
        // quick tap: toggle action menu for that unit
        setDraggingUnitId(null);

        setMenuForUnit((prev) => (prev === unitId ? null : unitId));
        // select unit
        const st = useGameStore.getState();
        const unit = st.state?.units[unitId];
        if (unit) st.selectBySquare(unit.position);
    }, []);

    const onUnitLongPress = useCallback((unitId: string) => {
        // long press: begin drag move mode
        setMenuForUnit(null);
        setDraggingUnitId(unitId);
        const st = useGameStore.getState();
        const unit = st.state?.units[unitId];
        if (unit) st.selectBySquare(unit.position);
    }, []);

    // Highlight target tiles only for the selected unit that belongs to current player and has not moved
    const highlightPositions = useMemo(() => {
        const s = state;
        if (!s?.selectedUnitId) return new Set<string>();
        const unit = s.units[s.selectedUnitId];
        if (!unit) return new Set<string>();
        if (unit.ownerId !== s.turn.currentPlayerId) return new Set<string>();
        if (unit.hasMoved) return new Set<string>();

        // WILDLY DRASTIC APPROACH: Just hardcode the four adjacent tiles
        const set = new Set<string>();
        const { x, y } = unit.position;

        // Add the four adjacent tiles (up, down, left, right)
        if (y > 0) set.add(`${x},${y - 1}`);           // up
        if (y < height - 1) set.add(`${x},${y + 1}`);   // down  
        if (x > 0) set.add(`${x - 1},${y}`);           // left
        if (x < width - 1) set.add(`${x + 1},${y}`);   // right

        console.log('HARDCODED highlights for unit at', x, y, ':', Array.from(set));
        return set;
    }, [state?.selectedUnitId, state?.turn.currentPlayerId, state?.units, width, height]);
    if (!state) {
        return <div style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading…</div>;
    }

    return (
        <div style={{ position: "absolute", inset: 0, touchAction: "manipulation" }}>
            <Canvas camera={{ position: [0, 14, 18], fov: 45 }} dpr={RENDER_CONFIG.dpr} gl={{ antialias: RENDER_CONFIG.antialias, powerPreference: RENDER_CONFIG.powerPreference }}>
                <color attach="background" args={["#3b82f6"]} />
                <ambientLight intensity={0.9} />
                <directionalLight position={[5, 10, 5]} intensity={1.1} color={"#ffffff"} />
                <group position={[0, 0, 0]}>
                    {/* Water surface - massive solid plane below the board */}
                    <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[200, 200]} />
                        <meshStandardMaterial
                            color="#3b82f6"
                            roughness={0.3}
                            metalness={0.1}
                        />
                    </mesh>

                    {/* Thick water volume for logs to sit on */}
                    <mesh position={[0, -1.5, 0]}>
                        <boxGeometry args={[200, 3, 200]} />
                        <meshBasicMaterial
                            color="#1e3a8a"
                            transparent
                            opacity={0.1}
                        />
                    </mesh>

                    {/* Grass ring surrounding the massive water */}
                    <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[100, 300, 32]} />
                        <meshStandardMaterial
                            color="#166534"
                            transparent
                            opacity={0.8}
                            roughness={1}
                            metalness={0}
                        />
                    </mesh>

                    {/* Static models (rocks, reeds, etc) */}
                    <StaticModels boardWidth={width} boardHeight={height} cellSize={cellSize} />

                    {/* Preload the bright lily pad model below the map */}
                    <group position={[0, -10, 0]}>
                        <UnitModel
                            modelUrl="/models/lillypad1-h.glb"
                            scaleFactor={0.3}
                            fitXZSize={cellSize * 0.9}
                            centerXZ={true}
                        />
                    </group>
                    {Array.from({ length: height }).map((_, y) =>
                        Array.from({ length: width }).map((_, x) => {
                            const isHighlighted = highlightPositions.has(`${x},${y}`);

                            return (
                                <group key={`${x}-${y}`}>
                                    <Tile
                                        x={x}
                                        y={y}
                                        size={cellSize}
                                        boardWidth={width}
                                        boardHeight={height}
                                        highlighted={isHighlighted}
                                        onTap={onTileTap}
                                    />
                                </group>
                            );
                        })
                    )}
                    <Units cellSize={cellSize} onUnitTap={onUnitTap} onUnitLongPress={onUnitLongPress} />

                    {/* TEST: Remove lily pads we clicked on */}
                </group>
                <OrbitControls
                    enablePan={false}
                    enableRotate
                    enableZoom
                    target={[0, 0, 0]}
                    minDistance={8}
                    maxDistance={20}
                    enableDamping
                    dampingFactor={0.08}
                    maxPolarAngle={Math.PI / 2.05}
                />
            </Canvas>
            {menuForUnit && <ActionMenu unitId={menuForUnit} />}
            <TurnIndicator />
        </div>
    );
}

function TurnIndicator() {
    const currentPlayerId = useGameStore(s => s.state?.turn.currentPlayerId);
    const turnNumber = useGameStore(s => s.state?.turn.turnNumber);

    const containerStyle: React.CSSProperties = {
        position: "absolute",
        top: 16,
        right: 16,
        padding: "8px 16px",
        backgroundColor: "rgba(0,0,0,0.15)",
        color: "#fff",
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 4,
        textShadow: "0 1px 2px rgba(0,0,0,0.6)",
    };

    return (
        <div style={containerStyle}>
            <div style={{ fontSize: 24, fontWeight: "bold" }}>
                {currentPlayerId === "p1" ? "Player 1's Turn" : "Player 2's Turn"}
            </div>
            <div style={{ fontSize: 14, opacity: 0.8 }}>
                Turn {turnNumber}
            </div>
        </div>
    );
}

function ActionMenu({ unitId }: { unitId: string }) {
    const st = useGameStore.getState();
    const unit = st.state?.units[unitId];
    if (!unit) return null;

    // Show if unit has already moved
    const hasMoved = unit.hasMoved;
    const containerStyle: React.CSSProperties = {
        position: "absolute",
        bottom: 16,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        gap: 8,
        pointerEvents: "auto",
        backgroundColor: "rgba(0,0,0,0.15)",
        padding: 8,
        borderRadius: 12,
        width: "fit-content",
        margin: "0 auto",
        // keep text/buttons fully opaque; rely on background alpha for transparency
    };
    return (
        <div style={containerStyle}>
            {!hasMoved && (
                <>
                    <button onClick={() => {/* placeholder: special action */ }}>Special</button>
                    <button onClick={() => {/* set attack mode via global state not available here */ }}>Attack</button>
                </>
            )}
            {hasMoved && (
                <div style={{ color: "#fff", opacity: 0.7 }}>Unit has moved</div>
            )}
            <button onClick={() => useGameStore.getState().dispatch({ kind: "endTurn" })}>End Turn</button>
        </div>
    );
}


