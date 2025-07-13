import { Rest } from "./core/rest";
import { Socket } from "./core/socket";

// Re-export core types for convenience
export type { Message } from "./interfaces/message.interface";

export const QPub = {
    Rest: Rest,
    Socket: Socket,
} as const;

export { Rest, Socket };
