export type TransportEvent =
  | { kind: "connected" }
  | { kind: "disconnected"; reason?: string };

export interface MultiplayerTransport {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  onEvent: (cb: (event: TransportEvent) => void) => () => void;
  send: (message: unknown) => void;
}

export class NoopTransport implements MultiplayerTransport {
  private cb: ((event: TransportEvent) => void) | null = null;

  async connect(): Promise<void> {
    this.cb?.({ kind: "connected" });
  }

  async disconnect(): Promise<void> {
    this.cb?.({ kind: "disconnected" });
  }

  onEvent(cb: (event: TransportEvent) => void): () => void {
    this.cb = cb;
    return () => {
      if (this.cb === cb) this.cb = null;
    };
  }

  send(_message: unknown): void {
    // Noop transport drops messages
  }
}


