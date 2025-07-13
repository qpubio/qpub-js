import React from "react";
import { SocketChannel } from "../../core/socket-channel";
import { ChannelEvents, ChannelEvent } from "../../types/event.type";
import { UseChannelReturn } from "../context/types";
import { useSocketContext } from "../context/SocketContext";
import { Message } from "../../interfaces/message.interface";

/**
 * Hook for managing Socket channels with direct SDK method exposure
 *
 * @param channelName - Name of the channel
 * @returns Channel state and all SDK methods
 */
export function useChannel(channelName: string): UseChannelReturn {
    const { socket } = useSocketContext();

    const [channel, setChannel] = React.useState<SocketChannel | null>(null);
    const [status, setStatus] = React.useState<ChannelEvent>("initialized");
    const [error, setError] = React.useState<Error | null>(null);

    // Get the actual SocketChannel from SDK
    React.useEffect(() => {
        if (!socket) return;

        const socketChannel = socket.channels.get(channelName);
        setChannel(socketChannel);

        // Set up SDK channel event listeners
        const handleInitialized = () => setStatus(ChannelEvents.INITIALIZED);
        const handleSubscribing = () => {
            setStatus(ChannelEvents.SUBSCRIBING);
            setError(null);
        };
        const handleSubscribed = () => {
            setStatus(ChannelEvents.SUBSCRIBED);
            setError(null);
        };
        const handleUnsubscribing = () =>
            setStatus(ChannelEvents.UNSUBSCRIBING);
        const handleUnsubscribed = () => setStatus(ChannelEvents.UNSUBSCRIBED);
        const handleFailed = (err: Error) => {
            setStatus(ChannelEvents.FAILED);
            setError(err);
        };

        // Subscribe to SDK channel events
        socketChannel.on(ChannelEvents.INITIALIZED, handleInitialized);
        socketChannel.on(ChannelEvents.SUBSCRIBING, handleSubscribing);
        socketChannel.on(ChannelEvents.SUBSCRIBED, handleSubscribed);
        socketChannel.on(ChannelEvents.UNSUBSCRIBING, handleUnsubscribing);
        socketChannel.on(ChannelEvents.UNSUBSCRIBED, handleUnsubscribed);
        socketChannel.on(ChannelEvents.FAILED, handleFailed);

        // Cleanup listeners when component unmounts or channel changes
        return () => {
            socketChannel.off(ChannelEvents.INITIALIZED, handleInitialized);
            socketChannel.off(ChannelEvents.SUBSCRIBING, handleSubscribing);
            socketChannel.off(ChannelEvents.SUBSCRIBED, handleSubscribed);
            socketChannel.off(ChannelEvents.UNSUBSCRIBING, handleUnsubscribing);
            socketChannel.off(ChannelEvents.UNSUBSCRIBED, handleUnsubscribed);
            socketChannel.off(ChannelEvents.FAILED, handleFailed);
        };
    }, [socket, channelName]);

    // Expose all SocketChannel methods directly
    const subscribe = React.useCallback(
        (callback: (message: Message) => void) => {
            if (!channel) throw new Error("Channel not available");
            return channel.subscribe(callback);
        },
        [channel]
    );

    const resubscribe = React.useCallback(async (): Promise<void> => {
        if (!channel) throw new Error("Channel not available");
        return channel.resubscribe();
    }, [channel]);

    const unsubscribe = React.useCallback(() => {
        if (!channel) throw new Error("Channel not available");
        return channel.unsubscribe();
    }, [channel]);

    const publish = React.useCallback(
        async (
            data: any,
            event?: string,
            clientId?: string
        ): Promise<void> => {
            if (!channel) throw new Error("Channel not available");
            return channel.publish(data, event, clientId);
        },
        [channel]
    );

    const isSubscribed = React.useCallback(() => {
        return channel?.isSubscribed() ?? false;
    }, [channel]);

    const isPendingSubscribe = React.useCallback(() => {
        return channel?.isPendingSubscribe() ?? false;
    }, [channel]);

    const setPendingSubscribe = React.useCallback(
        (pending: boolean) => {
            if (!channel) throw new Error("Channel not available");
            return channel.setPendingSubscribe(pending);
        },
        [channel]
    );

    const reset = React.useCallback(() => {
        if (!channel) throw new Error("Channel not available");
        return channel.reset();
    }, [channel]);

    const getName = React.useCallback(() => {
        return channel?.getName() ?? "";
    }, [channel]);

    return {
        channel,
        status,
        error,
        subscribe,
        resubscribe,
        unsubscribe,
        publish,
        isSubscribed,
        isPendingSubscribe,
        setPendingSubscribe,
        reset,
        getName,
    };
}
