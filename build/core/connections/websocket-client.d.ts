import { QPubWebSocket } from "../../types/services/websocket";
import { IWebSocketClient, ILogger } from "../../types/services/clients";
export declare class WebSocketClient implements IWebSocketClient {
    private socket;
    private WebSocketImplementation;
    private logger;
    constructor(logger: ILogger);
    getSocket(): QPubWebSocket | null;
    connect(url: string): void;
    isConnected(): boolean;
    disconnect(): void;
    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
    reset(): void;
}
//# sourceMappingURL=websocket-client.d.ts.map