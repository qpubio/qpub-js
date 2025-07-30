import { Channel } from "../../interfaces/channel.interface";
import { EventEmitter } from "../shared/event-emitter";
import { ChannelEventPayloads } from "../../types/internal-events";
import { ChannelEvents } from "../../types/event.type";

export abstract class BaseChannel extends EventEmitter<ChannelEventPayloads> implements Channel {
    public readonly name: string;

    constructor(name: string) {
        super();
        this.name = name;
        this.emit(ChannelEvents.INITIALIZED, { channelName: name });
    }

    public getName(): string {
        return this.name;
    }

    abstract publish(message: any): Promise<void>;

    abstract reset(): void;
}
