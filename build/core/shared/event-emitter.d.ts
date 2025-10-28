import { EventListener } from "../../types/events/listeners";
interface EventMap {
    [K: string]: any;
}
type EmitArgs<TEvents extends EventMap, K extends keyof TEvents> = TEvents[K] extends void ? [] : [TEvents[K]];
declare class EventEmitter<TEvents extends EventMap = EventMap> {
    private events;
    constructor();
    on(event: string, listener: EventListener): void;
    off(event: string, listener: EventListener): void;
    once(event: string, listener: EventListener): void;
    emit<K extends keyof TEvents>(event: K, ...args: EmitArgs<TEvents, K>): void;
    emit(event: string, ...args: any[]): void;
    removeAllListeners(event?: string): void;
    listenerCount(event: string): number;
    eventNames(): string[];
}
export { EventEmitter };
//# sourceMappingURL=event-emitter.d.ts.map