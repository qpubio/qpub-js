/**
 * WebSocket Interface
 *
 * Platform-agnostic WebSocket interface that works across browsers and Node.js.
 */
export interface QPubWebSocket {
    onopen: ((event: any) => void) | null;
    onclose: ((event: any) => void) | null;
    onmessage: ((event: any) => void) | null;
    onerror: ((event: any) => void) | null;
    onping: ((event: any) => void) | null;
    onpong: ((event: any) => void) | null;
    close(): void;
    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
    readyState: number;
    addEventListener(event: string, listener: (event: any) => void): void;
    removeEventListener(event: string, listener: (event: any) => void): void;
}
//# sourceMappingURL=websocket.d.ts.map