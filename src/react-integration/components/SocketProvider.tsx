import React from "react";
import { Socket } from "../../core/socket";
import { SocketContext, SocketContextValue } from "../context/SocketContext";
import { SocketProviderProps } from "../context/types";
import { Option } from "../../interfaces/option.interface";
import { isClient, useIsMounted } from "../utils/ssr";

// Global socket instance management
interface SocketInstance {
    socket: Socket;
    refCount: number;
}

const globalInstances = new Map<string, SocketInstance>();

// Create instance key from critical options - stable serialization
function createInstanceKey(options: Partial<Option>): string {
    const criticalOptions = {
        apiKey: options.apiKey || "",
        authUrl: options.authUrl || "",
        clientId: options.clientId || "",
        wsHost: options.wsHost || "",
        wsPort: options.wsPort || null,
        httpHost: options.httpHost || "",
        httpPort: options.httpPort || null,
        isSecure: options.isSecure ?? true,
    };
    
    // Sort keys for stable serialization
    const sortedOptions = Object.keys(criticalOptions).sort().reduce((obj, key) => {
        obj[key] = criticalOptions[key as keyof typeof criticalOptions];
        return obj;
    }, {} as any);
    
    return btoa(JSON.stringify(sortedOptions)).replace(/[+/=]/g, "");
}

export function SocketProvider({
    children,
    options = {},
    fallback: Fallback,
}: SocketProviderProps) {
    const isMounted = useIsMounted();
    const [socket, setSocket] = React.useState<Socket | null>(null);
    const instanceKeyRef = React.useRef<string>("");
    const optionsRef = React.useRef<Partial<Option>>(options);

    // Only update options ref if they actually changed
    const optionsChanged = JSON.stringify(optionsRef.current) !== JSON.stringify(options);
    if (optionsChanged) {
        optionsRef.current = options;
    }

    React.useEffect(() => {
        if (!isClient || !isMounted) return;

        const instanceKey = createInstanceKey(optionsRef.current);
        
        // If same instance key and we already have a socket, no need to change
        if (instanceKeyRef.current === instanceKey && socket) {
            return;
        }

        // Release previous instance if we had one
        if (instanceKeyRef.current && instanceKeyRef.current !== instanceKey) {
            const prevInstance = globalInstances.get(instanceKeyRef.current);
            if (prevInstance) {
                prevInstance.refCount--;
                console.log(`[QPub] Released instance ${instanceKeyRef.current}, ref count: ${prevInstance.refCount}`);
                
                if (prevInstance.refCount <= 0) {
                    console.log(`[QPub] Cleaning up instance: ${instanceKeyRef.current}`);
                    try {
                        prevInstance.socket.reset();
                    } catch (error) {
                        console.warn('[QPub] Error during socket cleanup:', error);
                    }
                    globalInstances.delete(instanceKeyRef.current);
                }
            }
        }

        // Get or create new instance
        let instance = globalInstances.get(instanceKey);
        if (!instance) {
            console.log(`[QPub] Creating new socket instance: ${instanceKey}`);
            const newSocket = new Socket({
                autoConnect: optionsRef.current.autoConnect ?? true,
                ...optionsRef.current,
            });
            
            instance = {
                socket: newSocket,
                refCount: 0,
            };
            globalInstances.set(instanceKey, instance);
        }

        instance.refCount++;
        console.log(`[QPub] Using instance ${instanceKey}, ref count: ${instance.refCount}`);
        
        instanceKeyRef.current = instanceKey;
        setSocket(instance.socket);

    }, [isMounted, optionsChanged]);

    // Cleanup effect - separate from main effect to avoid issues
    React.useEffect(() => {
        return () => {
            if (instanceKeyRef.current) {
                const currentInstance = globalInstances.get(instanceKeyRef.current);
                if (currentInstance) {
                    currentInstance.refCount--;
                    console.log(`[QPub] Unmount cleanup for ${instanceKeyRef.current}, ref count: ${currentInstance.refCount}`);
                    
                    if (currentInstance.refCount <= 0) {
                        console.log(`[QPub] Final cleanup for instance: ${instanceKeyRef.current}`);
                        try {
                            currentInstance.socket.reset();
                        } catch (error) {
                            console.warn('[QPub] Error during final cleanup:', error);
                        }
                        globalInstances.delete(instanceKeyRef.current);
                    }
                }
            }
        };
    }, []);

    const contextValue: SocketContextValue | null = React.useMemo(() => {
        if (!socket) return null;
        return { socket };
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
