import React from "react";
import { Socket } from "../../core/socket";
import { SocketContext, SocketContextValue } from "../context/SocketContext";
import { SocketProviderProps } from "../context/types";
import { isClient } from "../utils/ssr";

export function SocketProvider({
    children,
    options = {},
    fallback: Fallback,
}: SocketProviderProps) {
    const [socket, setSocket] = React.useState<Socket | null>(null);

    // Initialize socket instance
    React.useEffect(() => {
        if (!isClient) return;

        const socketInstance = new Socket({
            autoConnect: options.autoConnect ?? true,
            ...options,
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.reset();
        };
    }, []);

    // Context value
    const contextValue: SocketContextValue | null = React.useMemo(() => {
        if (!socket) return null;

        return {
            socket,
        };
    }, [socket]);

    // Show fallback if socket is not ready
    if (!contextValue && Fallback) {
        return <Fallback />;
    }

    return (
        <SocketContext.Provider value={contextValue}>
            {children}
        </SocketContext.Provider>
    );
}
