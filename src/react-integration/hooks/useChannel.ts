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
            if (!socket) throw new Error("Socket not available");
            const socketChannel = socket.channels.get(channelName);
            return socketChannel.subscribe(callback);
        },
        [socket, channelName]
    );

    const resubscribe = React.useCallback(async (): Promise<void> => {
        if (!socket) throw new Error("Socket not available");
        const socketChannel = socket.channels.get(channelName);
        return socketChannel.resubscribe();
    }, [socket, channelName]);

    const unsubscribe = React.useCallback(() => {
        if (!socket) throw new Error("Socket not available");
        const socketChannel = socket.channels.get(channelName);
        return socketChannel.unsubscribe();
    }, [socket, channelName]);

    const publish = React.useCallback(
        async (
            data: any,
            event?: string,
            clientId?: string
        ): Promise<void> => {
            if (!socket) throw new Error("Socket not available");
            const socketChannel = socket.channels.get(channelName);
            return socketChannel.publish(data, event, clientId);
        },
        [socket, channelName]
    );

    const isSubscribed = React.useCallback(() => {
        if (!socket) return false;
        const socketChannel = socket.channels.get(channelName);
        return socketChannel.isSubscribed();
    }, [socket, channelName]);

    const isPendingSubscribe = React.useCallback(() => {
        if (!socket) return false;
        const socketChannel = socket.channels.get(channelName);
        return socketChannel.isPendingSubscribe();
    }, [socket, channelName]);

    const setPendingSubscribe = React.useCallback(
        (pending: boolean) => {
            if (!socket) throw new Error("Socket not available");
            const socketChannel = socket.channels.get(channelName);
            return socketChannel.setPendingSubscribe(pending);
        },
        [socket, channelName]
    );

    const reset = React.useCallback(() => {
        if (!socket) throw new Error("Socket not available");
        const socketChannel = socket.channels.get(channelName);
        return socketChannel.reset();
    }, [socket, channelName]);

    const getName = React.useCallback(() => {
        if (!socket) return "";
        const socketChannel = socket.channels.get(channelName);
        return socketChannel.getName();
    }, [socket, channelName]);

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
