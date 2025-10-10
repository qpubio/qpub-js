import React from "react";
import { Socket } from "../../core/socket";
import { SocketContext, SocketContextValue } from "../context/SocketContext";
import { SocketProviderProps } from "../context/types";
import { isClient, useIsMounted } from "../utils/ssr";

export function SocketProvider({
    children,
    options = {},
    fallback: Fallback,
}: SocketProviderProps) {
    const isMounted = useIsMounted();
    const [socket, setSocket] = React.useState<Socket | null>(null);
    const socketRef = React.useRef<Socket | null>(null);

    React.useEffect(() => {
        if (!isClient || !isMounted) return;

        // Create new Socket instance for this provider
        const newSocket = new Socket({
            autoConnect: options.autoConnect ?? true,
            ...options,
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        // Cleanup on unmount or options change
        return () => {
            try {
                newSocket.reset();
            } catch (error) {
                console.warn("[QPub] Error during socket cleanup:", error);
            }
            socketRef.current = null;
        };
    }, [isMounted, JSON.stringify(options)]);

    const contextValue: SocketContextValue | null = React.useMemo(() => {
        if (!socket) return null;
        return {
            socket,
            instanceId: socket.getInstanceId(),
        };
    }, [socket]);

    if (!contextValue) {
        return Fallback ? <Fallback /> : null;
    }

    return (
        <SocketContext.Provider value={contextValue}>
            {children}
        </SocketContext.Provider>
    );
}
