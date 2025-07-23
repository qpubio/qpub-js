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
    const [socket, setSocket] = React.useState<Socket | null>(null);
    const socketRef = React.useRef<Socket | null>(null);
    const isMounted = useIsMounted();

    // Initialize socket instance
    React.useEffect(() => {
        if (!isClient || !isMounted) return;

        // Prevent creating multiple socket instances
        if (socketRef.current) {
            console.log("[QPub] Socket already exists, skipping creation");
            return;
        }

        console.log("[QPub] Creating new socket instance");
        const socketInstance = new Socket({
            autoConnect: options.autoConnect ?? true,
            ...options,
        });

        socketRef.current = socketInstance;
        setSocket(socketInstance);

        return () => {
            if (socketRef.current) {
                console.log("[QPub] Cleaning up socket instance");
                socketRef.current.reset();
                socketRef.current = null;
            }
        };
    }, [options.apiKey, options.autoConnect, isMounted]); // Only recreate if key options change

    // Context value
    const contextValue: SocketContextValue | null = React.useMemo(() => {
        if (!socket) return null;

        return {
            socket,
        };
    }, [socket]);

    // Show fallback if socket is not ready
    if (!contextValue) {
        return Fallback ? <Fallback /> : null;
    }

    return (
        <SocketContext.Provider value={contextValue}>
            {children}
        </SocketContext.Provider>
    );
}
