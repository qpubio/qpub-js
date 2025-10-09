import React from "react";
import { ConnectionEvents, ConnectionEvent } from "../../types/event.type";
import { UseConnectionReturn, ConnectionDetails } from "../context/types";
import { useSocketContext } from "../context/SocketContext";

/**
 * Hook for managing Socket connection state
 * Exposes all connection control methods from SDK
 *
 * @returns Connection state and control methods
 */
export function useConnection(): UseConnectionReturn {
    const { socket } = useSocketContext();
    const [status, setStatus] = React.useState<ConnectionEvent>(
        ConnectionEvents.INITIALIZED
    );
    const [connectionId, setConnectionId] = React.useState<string | null>(null);
    const [connectionDetails, setConnectionDetails] = React.useState<ConnectionDetails | null>(null);

    React.useEffect(() => {
        if (!socket) return;

        const connection = socket.connection;

        // Event handlers that track actual SDK connection events
        const handleInitialized = () => {
            setStatus(ConnectionEvents.INITIALIZED);
        };

        const handleConnecting = () => {
            setStatus(ConnectionEvents.CONNECTING);
        };

        const handleOpened = () => {
            setStatus(ConnectionEvents.OPENED);
        };

        const handleConnected = (payload: { connectionId: string; connectionDetails?: ConnectionDetails }) => {
            setStatus(ConnectionEvents.CONNECTED);
            setConnectionId(payload?.connectionId || null);
            setConnectionDetails(payload?.connectionDetails || null);
        };

        const handleDisconnected = () => {
            setStatus(ConnectionEvents.DISCONNECTED);
            setConnectionId(null);
            setConnectionDetails(null);
        };

        const handleClosing = () => {
            setStatus(ConnectionEvents.CLOSING);
        };

        const handleClosed = () => {
            setStatus(ConnectionEvents.CLOSED);
            setConnectionId(null);
            setConnectionDetails(null);
        };

        const handleFailed = () => {
            setStatus(ConnectionEvents.FAILED);
        };

        // Subscribe to all SDK connection events
        connection.on(ConnectionEvents.INITIALIZED, handleInitialized);
        connection.on(ConnectionEvents.CONNECTING, handleConnecting);
        connection.on(ConnectionEvents.OPENED, handleOpened);
        connection.on(ConnectionEvents.CONNECTED, handleConnected);
        connection.on(ConnectionEvents.DISCONNECTED, handleDisconnected);
        connection.on(ConnectionEvents.CLOSING, handleClosing);
        connection.on(ConnectionEvents.CLOSED, handleClosed);
        connection.on(ConnectionEvents.FAILED, handleFailed);

        // Set initial connection status to reflect actual SDK state
        setStatus(
            connection.isConnected()
                ? ConnectionEvents.CONNECTED
                : ConnectionEvents.DISCONNECTED
        );

        // Cleanup - unsubscribe from all SDK connection events
        return () => {
            connection.off(ConnectionEvents.INITIALIZED, handleInitialized);
            connection.off(ConnectionEvents.CONNECTING, handleConnecting);
            connection.off(ConnectionEvents.OPENED, handleOpened);
            connection.off(ConnectionEvents.CONNECTED, handleConnected);
            connection.off(ConnectionEvents.DISCONNECTED, handleDisconnected);
            connection.off(ConnectionEvents.CLOSING, handleClosing);
            connection.off(ConnectionEvents.CLOSED, handleClosed);
            connection.off(ConnectionEvents.FAILED, handleFailed);
        };
    }, [socket]);

    // Expose connection control methods
    const connect = React.useCallback(async (): Promise<void> => {
        if (!socket) throw new Error("Socket not available");
        return socket.connection.connect();
    }, [socket]);

    const isConnected = React.useCallback((): boolean => {
        if (!socket) return false;
        return socket.connection.isConnected();
    }, [socket]);

    const disconnect = React.useCallback((): void => {
        if (!socket) throw new Error("Socket not available");
        return socket.connection.disconnect();
    }, [socket]);

    const ping = React.useCallback((): Promise<number> => {
        if (!socket) throw new Error("Socket not available");
        return socket.connection.ping();
    }, [socket]);

    const reset = React.useCallback((): void => {
        if (!socket) throw new Error("Socket not available");
        return socket.connection.reset();
    }, [socket]);

    return {
        status,
        connectionId,
        connectionDetails,
        connect,
        isConnected,
        disconnect,
        ping,
        reset,
    };
}
