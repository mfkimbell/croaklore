export type UnitId = string;
export type PlayerId = string;

export type Coordinate = {
  x: number;
  y: number;
};

export function coordinateKey(coord: Coordinate): string {
  return `${coord.x},${coord.y}`;
}

export type UnitStats = {
  maxHealth?: number;
  attack?: number;
  moveRange?: number;
  attackRange?: number;
};

export type TriggerType =
  | "onEnter"
  | "onDeath"
  | "onEndTurn"
  | "onOtherUnitDeath"
  | "onOtherUnitDamaged"
  | "onFirstDamage"
  | "onAnyDamage"
  | "onCardDraw"
  | "onUnitInRange"
  | `custom:${string}`;

export type GameContext = {
  getUnitById: (unitId: UnitId) => UnitInstance | undefined;
  getUnitsOwnedBy: (playerId: PlayerId) => UnitInstance[];
  getEnemyUnitsOf: (playerId: PlayerId) => UnitInstance[];
  damageUnit: (unitId: UnitId, amount: number, sourceId?: UnitId) => void;
  moveUnit: (unitId: UnitId, to: Coordinate) => void;
};

export type UnitTriggerHandler = (ctx: GameContext, self: UnitInstance) => void;

export type UnitBehavior = Partial<Record<TriggerType, UnitTriggerHandler[]>>;

export type UnitDefinition = {
  id: string;
  name: string;
  stats?: UnitStats;
  /** Squares relative to origin the unit occupies; default [[0,0]] */
  footprint?: Coordinate[];
  behavior?: UnitBehavior;
};

export type UnitInstance = {
  id: UnitId;
  defId: string;
  name: string;
  ownerId: PlayerId;
  position: Coordinate; // origin square (top-left) of footprint
  footprint: Coordinate[]; // absolute offsets relative to origin
  currentHealth?: number;
  hasTakenDamage?: boolean;
};

export type BoardDefinition = {
  width: number;
  height: number;
  blocked: Set<string>; // coordinateKey set
};

export type PlayerState = {
  id: PlayerId;
  deck: UnitDefinition[];
  hand: UnitDefinition[];
  discard: UnitDefinition[];
};

export type TurnState = {
  currentPlayerId: PlayerId;
  turnNumber: number;
};

export type GameState = {
  board: BoardDefinition;
  players: Record<PlayerId, PlayerState>;
  units: Record<UnitId, UnitInstance>;
  unitOrder: UnitId[];
  selectedUnitId?: UnitId;
  turn: TurnState;
  // Undo/redo stacks hold deep snapshots
  past: HistorySnapshot[];
  future: HistorySnapshot[];
};

export type MoveAction = {
  kind: "move";
  unitId: UnitId;
  to: Coordinate;
};

export type AttackAction = {
  kind: "attack";
  attackerId: UnitId;
  targetId: UnitId;
};

export type EndTurnAction = {
  kind: "endTurn";
};

export type GameAction = MoveAction | AttackAction | EndTurnAction;

// A serializable snapshot for history
export type HistorySnapshot = {
  board: { width: number; height: number; blocked: string[] };
  players: Record<PlayerId, PlayerState>;
  units: Record<UnitId, UnitInstance>;
  unitOrder: UnitId[];
  selectedUnitId?: UnitId;
  turn: TurnState;
};


