import { Channel } from "../../types/services/channel";
import { EventEmitter } from "../shared/event-emitter";
import { ChannelEventPayloads } from "../../types/events/payloads";
export declare abstract class BaseChannel extends EventEmitter<ChannelEventPayloads> implements Channel {
    readonly name: string;
    constructor(name: string);
    getName(): string;
    abstract publish(message: any): Promise<void>;
    abstract reset(): void;
}
//# sourceMappingURL=channel.d.ts.map