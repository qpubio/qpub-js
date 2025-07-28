import { EventListener } from "types/listener.type";

// Internal event map interface for type safety
interface EventMap {
    [K: string]: any;
}

// Type helper for emit arguments
type EmitArgs<TEvents extends EventMap, K extends keyof TEvents> = 
    TEvents[K] extends void ? [] : [TEvents[K]];

class EventEmitter<TEvents extends EventMap = EventMap> {
    private events: Map<string, Set<EventListener>>;

    constructor() {
        this.events = new Map();
    }

    public on(event: string, listener: EventListener): void {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event)!.add(listener);
    }

    public off(event: string, listener: EventListener): void {
        const listeners = this.events.get(event);
        if (listeners) {
            listeners.delete(listener);
            if (listeners.size === 0) {
                this.events.delete(event);
            }
        }
    }

    public once(event: string, listener: EventListener): void {
        const onceWrapper = (...args: any[]) => {
            listener(...args);
            this.off(event, onceWrapper);
        };
        this.on(event, onceWrapper);
    }

    // Type-safe emit method - same name, just with optional typing
    public emit<K extends keyof TEvents>(
        event: K,
        ...args: EmitArgs<TEvents, K>
    ): void;
    public emit(event: string, ...args: any[]): void;
    public emit(event: string, ...args: any[]): void {
        const listeners = this.events.get(event);
        if (listeners) {
            listeners.forEach((listener) => {
                try {
                    listener(...args);
                } catch (error) {
                    console.error(
                        `Error in event listener for ${event}`,
                        error
                    );
                }
            });
        }
    }

    public removeAllListeners(event?: string): void {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }

    public listenerCount(event: string): number {
        const listeners = this.events.get(event);
        return listeners ? listeners.size : 0;
    }

    public eventNames(): string[] {
        return Array.from(this.events.keys());
    }
}

export { EventEmitter };
