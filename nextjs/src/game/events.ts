import { TriggerType, UnitInstance, GameContext } from "./types";

type Listener = (ctx: GameContext, unit: UnitInstance) => void;

export class EventBus {
  private listeners: Map<TriggerType, Set<Listener>> = new Map();

  subscribe(trigger: TriggerType, listener: Listener): () => void {
    if (!this.listeners.has(trigger)) {
      this.listeners.set(trigger, new Set());
    }
    const set = this.listeners.get(trigger)!;
    set.add(listener);
    return () => set.delete(listener);
  }

  emit(trigger: TriggerType, ctx: GameContext, unit: UnitInstance): void {
    const set = this.listeners.get(trigger);
    if (!set) return;
    for (const listener of set) {
      listener(ctx, unit);
    }
  }
}


