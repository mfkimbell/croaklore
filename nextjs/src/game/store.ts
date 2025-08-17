import { create } from "zustand";
import { produce } from "immer";
import {
  Coordinate,
  GameAction,
  GameState,
  PlayerId,
  UnitDefinition,
  UnitId,
} from "./types";
import {
  createBoard,
  createInitialState,
  createUnitInstance,
  getUnitAt,
  step,
  undo as undoEngine,
  redo as redoEngine,
  calculateBasicMoves,
  calculateAttackTargets,
} from "./engine";

type StoreState = {
  state: GameState | null;
  init: (width: number, height: number, players: PlayerId[]) => void;
  addUnit: (ownerId: PlayerId, def: UnitDefinition, id: UnitId, position: Coordinate) => void;
  dispatch: (action: GameAction) => void;
  selectBySquare: (coord: Coordinate) => void;
  legalMovesOfSelected: () => Coordinate[];
  legalAttacksOfSelected: () => UnitId[];
  undo: () => void;
  redo: () => void;
};

export const useGameStore = create<StoreState>((set, get) => ({
  state: null,
  init: (width, height, players) => {
    const board = createBoard(width, height);
    const initial = createInitialState(board, players);
    set({ state: initial });
  },
  addUnit: (ownerId, def, id, position) => {
    set((prev) => {
      if (!prev.state) return prev;
      const next = produce(prev.state, (draft) => {
        const instance = createUnitInstance(def, ownerId, id, position);
        draft.units[instance.id] = instance;
        draft.unitOrder.push(instance.id);
      });
      return { state: next };
    });
  },
  dispatch: (action) => {
    set((prev) => {
      if (!prev.state) return prev;
      const next = step(prev.state, action);
      return { state: next };
    });
  },
  selectBySquare: (coord) => {
    set((prev) => {
      if (!prev.state) return prev;
      const unit = getUnitAt(prev.state, coord);
      const next = produce(prev.state, (draft) => {
        // Only allow selecting your own unit on your turn
        if (unit && unit.ownerId === draft.turn.currentPlayerId) {
          draft.selectedUnitId = unit.id;
        } else {
          draft.selectedUnitId = undefined;
        }
      });
      return { state: next };
    });
  },
  legalMovesOfSelected: () => {
    const s = get().state;
    if (!s || !s.selectedUnitId) return [];
    const unit = s.units[s.selectedUnitId];
    if (!unit) return [];
    return calculateBasicMoves(s, unit);
  },
  legalAttacksOfSelected: () => {
    const s = get().state;
    if (!s || !s.selectedUnitId) return [] as UnitId[];
    const unit = s.units[s.selectedUnitId];
    if (!unit) return [] as UnitId[];
    const targets = calculateAttackTargets(s, unit);
    return targets.map(t => t.id);
  },
  undo: () => {
    set((prev) => {
      if (!prev.state) return prev;
      const next = undoEngine(prev.state);
      return { state: next };
    });
  },
  redo: () => {
    set((prev) => {
      if (!prev.state) return prev;
      const next = redoEngine(prev.state);
      return { state: next };
    });
  },
}));

export const DemoUnits = {
  Soldier: (_id: string): UnitDefinition => ({ id: "soldier", name: "Soldier", stats: { maxHealth: 3, attack: 1, moveRange: 1, attackRange: 1 } }),
  Archer: (_id: string): UnitDefinition => ({ id: "archer", name: "Archer", stats: { maxHealth: 2, attack: 1, moveRange: 1, attackRange: 2 } }),
};


