import React from "react";
import { SocketChannel } from "../../core/channels/socket-channel";
import {
    ChannelEvents,
    ChannelEvent,
    ConnectionEvents,
    ConnectionEvent,
} from "../../types/event.type";
import { UseChannelReturn } from "../context/types";
import { useSocketContext } from "../context/SocketContext";
import { Message } from "../../interfaces/message.interface";

/**
 * React hook that provides a thin wrapper around the core SocketChannel.
 *
 * This follows the SDK's design - no automatic subscriptions, just manual control.
 * Use the subscribe() method to manually subscribe with your callback.
 *
 * Example usage (following SDK examples):
 * ```
 * const { status, subscribe, unsubscribe } = useChannel("my-channel");
 *
 * useEffect(() => {
 *     if (status === "initialized") {
 *         subscribe(handleMessage);
 *     }
 * }, [status, subscribe, handleMessage]);
 * ```
 */
export function useChannel(channelName: string): UseChannelReturn {
    const { socket } = useSocketContext();

    const [channel, setChannel] = React.useState<SocketChannel | null>(null);
    const [status, setStatus] = React.useState<ChannelEvent>("initialized");
    const [error, setError] = React.useState<Error | null>(null);
    const [connectionStatus, setConnectionStatus] =
        React.useState<ConnectionEvent>("closed");

    const ready = React.useMemo(() => {
        return (
            connectionStatus === "connected" &&
            (status === "initialized" ||
                status === "subscribing" ||
                status === "subscribed")
        );
    }, [connectionStatus, status]);

    // Set up channel and event listeners
    React.useEffect(() => {
        if (!socket) return;

        const socketChannel = socket.channels.get(channelName);
        setChannel(socketChannel);

        const handleChannelSubscribing = () => setStatus("subscribing");
        const handleChannelSubscribed = () => setStatus("subscribed");
        const handleChannelUnsubscribed = () => setStatus("initialized");
        const handleChannelFailed = (event: any) => setError(event.error);

        socketChannel.on(ChannelEvents.SUBSCRIBING, handleChannelSubscribing);
        socketChannel.on(ChannelEvents.SUBSCRIBED, handleChannelSubscribed);
        socketChannel.on(ChannelEvents.UNSUBSCRIBED, handleChannelUnsubscribed);
        socketChannel.on(ChannelEvents.FAILED, handleChannelFailed);

        return () => {
            socketChannel.off(
                ChannelEvents.SUBSCRIBING,
                handleChannelSubscribing
            );
            socketChannel.off(
                ChannelEvents.SUBSCRIBED,
                handleChannelSubscribed
            );
            socketChannel.off(
                ChannelEvents.UNSUBSCRIBED,
                handleChannelUnsubscribed
            );
            socketChannel.off(ChannelEvents.FAILED, handleChannelFailed);
        };
    }, [socket, channelName]);

    // Set up connection listeners
    React.useEffect(() => {
        if (!socket) return;

        const handleConnectionOpened = () => setConnectionStatus("connected");
        const handleConnectionClosed = () => setConnectionStatus("closed");
        const handleConnectionFailed = () => setConnectionStatus("failed");

        socket.connection.on(ConnectionEvents.OPENED, handleConnectionOpened);
        socket.connection.on(ConnectionEvents.CLOSED, handleConnectionClosed);
        socket.connection.on(ConnectionEvents.FAILED, handleConnectionFailed);

        return () => {
            socket.connection.off(
                ConnectionEvents.OPENED,
                handleConnectionOpened
            );
            socket.connection.off(
                ConnectionEvents.CLOSED,
                handleConnectionClosed
            );
            socket.connection.off(
                ConnectionEvents.FAILED,
                handleConnectionFailed
            );
        };
    }, [socket, channelName]);

    // Thin wrapper methods that just call the core SDK methods
    const subscribe = React.useCallback(
        (callback: (message: Message) => void) => {
            if (!channel) throw new Error("Channel not available");
            channel.subscribe(callback);
        },
        [channel]
    );

    const unsubscribe = React.useCallback(() => {
        if (!channel) return;
        channel.unsubscribe();
    }, [channel]);

    const publish = React.useCallback(
        async (data: any, event?: string, clientId?: string) => {
            if (!channel) throw new Error("Channel not available");
            return channel.publish(data, event, clientId);
        },
        [channel]
    );

    const resubscribe = React.useCallback(async () => {
        if (!channel) throw new Error("Channel not available");
        return channel.resubscribe();
    }, [channel]);

    const isSubscribed = React.useCallback(() => {
        return channel?.isSubscribed() ?? false;
    }, [channel]);

    const isPendingSubscribe = React.useCallback(() => {
        return channel?.isPendingSubscribe() ?? false;
    }, [channel]);

    const setPendingSubscribe = React.useCallback(
        (pending: boolean) => {
            if (!channel) return;
            channel.setPendingSubscribe(pending);
        },
        [channel]
    );

    const reset = React.useCallback(() => {
        if (!channel) return;
        channel.reset();
    }, [channel]);

    const getName = React.useCallback(() => {
        return channel?.getName() ?? channelName;
    }, [channel, channelName]);

    return {
        // States
        channel,
        status,
        error,
        ready,

        // Core SDK methods (thin wrappers)
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
