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
                    return (
                        <group
                            key={`${groupName}-${i}`}
                            position={[worldX, 0, worldZ]}
                            scale={model.scale}
                            rotation={[0, model.rotation, 0]}
                        >
                            <UnitModel
                                modelUrl={model.modelUrl}
                                scaleFactor={0.3}
                                fitXZSize={undefined}
                            />
                        </group>
                    );
                })
            ))}
        </group>
    );
}

function Tile({ x, y, size, boardWidth, boardHeight, onTap }: { x: number; y: number; size: number; boardWidth: number; boardHeight: number; onTap: (x: number, y: number) => void }) {
    const W = boardWidth * size;
    const H = boardHeight * size;
    const px = x * size - W / 2 + size / 2;
    const py = y * size - H / 2 + size / 2;
    return (
        <mesh position={[px, 0, py]} onPointerDown={() => onTap(x, y)}>
            <boxGeometry args={[size * 0.98, 0.05, size * 0.98]} />
            <meshStandardMaterial color={"#e5e7eb"} roughness={0.95} metalness={0} />
        </mesh>
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
                        <UnitModel modelUrl="/models/Frog.gltf" animationUrl="/models/Animations/Frog_Idle.gltf" playClip="Frog_Idle" fitXZSize={cellSize * 0.9} centerXZ={false} />
                        {selected && (
                            <mesh position={[0, 0.01, 0]}>
                                <ringGeometry args={[cellSize * 0.4, cellSize * 0.45, 32]} />
                                <meshBasicMaterial color="#22c55e" transparent opacity={0.8} />
                            </mesh>
                        )}
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
    const [draggingUnitId, setDraggingUnitId] = useState<string | null>(null);
    const [dragTo, setDragTo] = useState<{ x: number; y: number } | null>(null);
    const legalMoves = useGameStore((s) => s.legalMovesOfSelected);
    const width = state?.board.width ?? 0;
    const height = state?.board.height ?? 0;

    const selectedUnitId = state?.selectedUnitId;
    const onTileTap = useCallback((x: number, y: number) => {
        if (draggingUnitId && selectedUnitId === draggingUnitId && dragTo) {
            // commit move if within legal moves
            const moves = legalMoves();
            if (moves.find((m) => m.x === x && m.y === y)) {
                useGameStore.getState().dispatch({ kind: "move", unitId: draggingUnitId, to: { x, y } });
            }
            setDraggingUnitId(null);
            setDragTo(null);
            return;
        }
        setMenuForUnit(null);
        selectBySquare({ x, y });
    }, [draggingUnitId, dragTo, legalMoves, selectBySquare, selectedUnitId]);

    const onUnitTap = useCallback((unitId: string) => {
        // quick tap: toggle action menu for that unit
        setDraggingUnitId(null);
        setDragTo(null);
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

    // Highlight target tile under drag
    const highlightPositions = useMemo(() => {
        if (!state?.selectedUnitId) return new Set<string>();
        const set = new Set<string>();
        for (const c of legalMoves()) set.add(`${c.x},${c.y}`);
        return set;
    }, [state?.selectedUnitId, legalMoves]);
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
                    {/* Water surface - large transparent plane below the board */}
                    <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[50, 50]} />
                        <meshStandardMaterial
                            color="#1e40af"
                            transparent
                            opacity={0.3}
                            roughness={0.9}
                            metalness={0}
                        />
                    </mesh>

                    {/* Fog of war / Land surrounding the water */}
                    <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[25, 100, 32]} />
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
                    {Array.from({ length: height }).map((_, y) =>
                        Array.from({ length: width }).map((_, x) => (
                            <group key={`${x}-${y}`}>
                                <Tile x={x} y={y} size={cellSize} boardWidth={width} boardHeight={height} onTap={onTileTap} />
                                {highlightPositions.has(`${x},${y}`) && (
                                    <mesh position={[x * cellSize - (width * cellSize) / 2 + cellSize / 2, 0.06, y * cellSize - (height * cellSize) / 2 + cellSize / 2]}>
                                        <boxGeometry args={[cellSize * 0.9, 0.02, cellSize * 0.9]} />
                                        <meshStandardMaterial color={"#16a34a"} transparent opacity={0.5} />
                                    </mesh>
                                )}
                            </group>
                        ))
                    )}
                    <Units cellSize={cellSize} onUnitTap={onUnitTap} onUnitLongPress={onUnitLongPress} />
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
        </div>
    );
}

function ActionMenu({ unitId }: { unitId: string }) {
    const st = useGameStore.getState();
    const unit = st.state?.units[unitId];
    if (!unit) return null;
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
            <button onClick={() => {/* placeholder: special action */ }}>Special</button>
            <button onClick={() => {/* placeholder: basic attack */ }}>Attack</button>
            <button onClick={() => {/* placeholder: end turn */ }}>End Turn</button>
        </div>
    );
}


