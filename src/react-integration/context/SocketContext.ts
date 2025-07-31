import React from "react";
import { Socket } from "../../core/socket";

export interface SocketContextValue {
    socket: Socket;
}

export const SocketContext = React.createContext<SocketContextValue | null>(null);

export const useSocketContext = (): SocketContextValue => {
    const context = React.useContext(SocketContext);
    if (!context) {
        throw new Error(
            "useSocketContext must be used within a SocketProvider"
        );
    }
    return context;
};
