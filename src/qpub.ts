import { Rest } from "./core/rest";
import { Socket } from "./core/socket";

export const QPub = {
    Rest: Rest,
    Socket: Socket,
} as const;

export { Rest, Socket };
