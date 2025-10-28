import React from "react";
import { Socket } from "../../core/socket";
export interface SocketContextValue {
    socket: Socket;
    instanceId: string;
}
export declare const SocketContext: React.Context<SocketContextValue | null>;
export declare const useSocketContext: () => SocketContextValue;
//# sourceMappingURL=SocketContext.d.ts.map