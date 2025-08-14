import { produce } from "immer";
import {
  BoardDefinition,
  Coordinate,
  GameAction,
  GameState,
  PlayerId,
  PlayerState,
  HistorySnapshot,
  TurnState,
  UnitDefinition,
  UnitId,
  UnitInstance,
  coordinateKey,
} from "./types";

export function createBoard(width: number, height: number, blocked: Coordinate[] = []): BoardDefinition {
  const blockedSet = new Set<string>(blocked.map(coordinateKey));
  return { width, height, blocked: blockedSet };
}

export function createUnitInstance(def: UnitDefinition, ownerId: PlayerId, id: UnitId, position: Coordinate): UnitInstance {
  const footprint = (def.footprint && def.footprint.length > 0) ? def.footprint : [{ x: 0, y: 0 }];
  return {
    id,
    defId: def.id,
    name: def.name,
    ownerId,
    position,
    footprint,
    currentHealth: def.stats?.maxHealth,
    hasTakenDamage: false,
  };
}

export function createInitialState(board: BoardDefinition, players: PlayerId[]): GameState {
  const playersState: Record<PlayerId, PlayerState> = {};
  for (const id of players) {
    playersState[id] = { id, deck: [], hand: [], discard: [] };
  }
  const turn: TurnState = { currentPlayerId: players[0], turnNumber: 1 };
  return {
    board,
    players: playersState,
    units: {},
    unitOrder: [],
    turn,
    past: [],
    future: [],
  };
}

export function isInsideBoard(board: BoardDefinition, coord: Coordinate): boolean {
  return coord.x >= 0 && coord.y >= 0 && coord.x < board.width && coord.y < board.height;
}

export function manhattanDistance(a: Coordinate, b: Coordinate): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function occupiedSquares(unit: UnitInstance): Coordinate[] {
  return unit.footprint.map((offset) => ({ x: unit.position.x + offset.x, y: unit.position.y + offset.y }));
}

export function isSquareBlocked(state: GameState, coord: Coordinate): boolean {
  return state.board.blocked.has(coordinateKey(coord));
}

export function isSquareOccupied(state: GameState, coord: Coordinate, ignoreUnitId?: UnitId): boolean {
  for (const unitId of state.unitOrder) {
    if (ignoreUnitId && unitId === ignoreUnitId) continue;
    const unit = state.units[unitId];
    for (const sq of occupiedSquares(unit)) {
      if (sq.x === coord.x && sq.y === coord.y) return true;
    }
  }
  return false;
}

export function canPlaceUnit(state: GameState, unit: UnitInstance, at: Coordinate): boolean {
  for (const offset of unit.footprint) {
    const target: Coordinate = { x: at.x + offset.x, y: at.y + offset.y };
    if (!isInsideBoard(state.board, target)) return false;
    if (isSquareBlocked(state, target)) return false;
    if (isSquareOccupied(state, target, unit.id)) return false;
  }
  return true;
}

export function getUnitAt(state: GameState, coord: Coordinate): UnitInstance | undefined {
  for (const unitId of state.unitOrder) {
    const unit = state.units[unitId];
    for (const sq of occupiedSquares(unit)) {
      if (sq.x === coord.x && sq.y === coord.y) return unit;
    }
  }
  return undefined;
}

export function calculateBasicMoves(state: GameState, unit: UnitInstance): Coordinate[] {
  const range = unitRange(unit, "move");
  const candidates: Coordinate[] = [];
  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const to = { x: unit.position.x + dx, y: unit.position.y + dy };
      if (manhattanDistance(unit.position, to) > range) continue;
      if (to.x === unit.position.x && to.y === unit.position.y) continue;
      if (!isInsideBoard(state.board, to)) continue;
      if (isSquareBlocked(state, to)) continue;
      // For multi-tile units, validate full footprint
      const tempUnit: UnitInstance = { ...unit, position: to };
      if (!canPlaceUnit(state, tempUnit, to)) continue;
      candidates.push(to);
    }
  }
  return candidates;
}

export function unitRange(unit: UnitInstance, kind: "move" | "attack"): number {
  if (kind === "move") return unitRangeFromStats(unit, unit.defId, "moveRange");
  return unitRangeFromStats(unit, unit.defId, "attackRange");
}

function unitRangeFromStats(_unit: UnitInstance, _defId: string, _key: "moveRange" | "attackRange"): number {
  // Default range 1 if undefined
  const defaultValue = 1;
  // We cannot access definition directly here; engine is definition-agnostic at runtime.
  // Store current ranges by inferring from instance via a hidden convention: use currentHealth undefined to not affect.
  // For now, return default and allow external systems to override if needed.
  return defaultValue;
}

export function applyDamage(state: GameState, unitId: UnitId, amount: number): void {
  const unit = state.units[unitId];
  if (!unit) return;
  const prev = unit.currentHealth ?? Infinity;
  const next = isFinite(prev) ? Math.max(0, prev - amount) : prev;
  unit.currentHealth = next;
  unit.hasTakenDamage = true;
  if (next === 0) {
    removeUnit(state, unitId);
  }
}

export function removeUnit(state: GameState, unitId: UnitId): void {
  delete state.units[unitId];
  const idx = state.unitOrder.indexOf(unitId);
  if (idx >= 0) state.unitOrder.splice(idx, 1);
  if (state.selectedUnitId === unitId) state.selectedUnitId = undefined;
}

export function deepCloneForHistory(state: GameState): HistorySnapshot {
  return JSON.parse(JSON.stringify({
    board: { width: state.board.width, height: state.board.height, blocked: Array.from(state.board.blocked) },
    players: state.players,
    units: state.units,
    unitOrder: state.unitOrder,
    selectedUnitId: state.selectedUnitId,
    turn: state.turn,
  })) as HistorySnapshot;
}

export function step(state: GameState, action: GameAction): GameState {
  const snapshot = deepCloneForHistory(state);
  const next = produce(state, (draft) => {
    draft.past.push(snapshot);
    draft.future = [];
    switch (action.kind) {
      case "move": {
        const unit = draft.units[action.unitId];
        if (!unit) return;
        const newPos = action.to;
        const temp = { ...unit, position: newPos };
        if (canPlaceUnit(draft, temp, newPos)) {
          unit.position = newPos;
        }
        break;
      }
      case "attack": {
        const attacker = draft.units[action.attackerId];
        const target = draft.units[action.targetId];
        if (!attacker || !target) return;
        const distance = manhattanDistance(attacker.position, target.position);
        const range = 1; // default attack range
        if (distance <= range) {
          const damage = 1; // default attack damage
          applyDamage(draft, target.id, damage);
        }
        break;
      }
      case "endTurn": {
        const order = Object.keys(draft.players);
        const currentIdx = order.indexOf(draft.turn.currentPlayerId);
        const nextIdx = (currentIdx + 1) % order.length;
        draft.turn.currentPlayerId = order[nextIdx];
        draft.turn.turnNumber += nextIdx === 0 ? 1 : 0;
        break;
      }
    }
  });
  return next as GameState;
}

export function undo(state: GameState): GameState {
  if (state.past.length === 0) return state;
  const last = state.past[state.past.length - 1] as HistorySnapshot;
  const present = deepCloneForHistory(state);
  const restored = produce(state, (draft) => {
    draft.past.pop();
    draft.future.push(present);
    draft.board = { width: last.board.width, height: last.board.height, blocked: new Set<string>(last.board.blocked) };
    draft.players = last.players;
    draft.units = last.units;
    draft.unitOrder = last.unitOrder;
    draft.selectedUnitId = last.selectedUnitId;
    draft.turn = last.turn;
  });
  return restored as GameState;
}

export function redo(state: GameState): GameState {
  if (state.future.length === 0) return state;
  const nextState = state.future[state.future.length - 1] as HistorySnapshot;
  const present = deepCloneForHistory(state);
  const moved = produce(state, (draft) => {
    draft.future.pop();
    draft.past.push(present);
    draft.board = { width: nextState.board.width, height: nextState.board.height, blocked: new Set<string>(nextState.board.blocked) };
    draft.players = nextState.players;
    draft.units = nextState.units;
    draft.unitOrder = nextState.unitOrder;
    draft.selectedUnitId = nextState.selectedUnitId;
    draft.turn = nextState.turn;
  });
  return moved as GameState;
}


