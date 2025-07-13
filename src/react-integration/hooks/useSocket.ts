import React from "react";
import { Socket } from "../../core/socket";
import { Option } from "../../interfaces/option.interface";
import { isClient } from "../utils/ssr";

/**
 * Hook to create and manage a Socket instance directly with options
 * Can be used without a provider for direct Socket access
 *
 * @param options - Socket options including apiKey
 * @returns Socket instance or null if not in client environment
 */
export function useSocket(options?: Partial<Option>): Socket | null {
    const [socket, setSocket] = React.useState<Socket | null>(null);

    React.useEffect(() => {
        if (!isClient) return;

        const socketInstance = new Socket({
            autoConnect: options?.autoConnect ?? true,
            ...options,
        });

        setSocket(socketInstance);

        // Cleanup on unmount or options change
        return () => {
            socketInstance.reset();
        };
    }, [JSON.stringify(options)]); // Serialize options for dependency comparison

    return socket;
}
