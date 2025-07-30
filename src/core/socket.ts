import { Option } from "../interfaces/option.interface";
import { Connection } from "./connections/connection";
import { OptionManager } from "./managers/option-manager";
import { uuidv7 } from "./shared/uuid";
import { AuthManager } from "./managers/auth-manager";
import { SocketChannelManager } from "./managers/channel-manager";
import { Logger } from "./shared/logger";

export class Socket {
    private instanceId: string;
    public optionManager: OptionManager;
    public authManager: AuthManager;
    public connection: Connection;
    public channels: SocketChannelManager;
    private logger: Logger;

    constructor(options?: Partial<Option>) {
        this.instanceId = `socket_${uuidv7()}`;
        this.optionManager = OptionManager.getInstance(
            this.instanceId,
            options
        );
        this.logger = new Logger(this.instanceId, "Socket");

        this.logger.debug("Initializing Socket instance");

        this.authManager = AuthManager.getInstance(this.instanceId);
        this.connection = Connection.getInstance(this.instanceId);
        this.channels = SocketChannelManager.getInstance(this.instanceId);

        if (this.optionManager.getOption("autoConnect")) {
            this.logger.info("Auto-connecting socket");
            this.connection.connect();
        }

        this.logger.info("Socket instance created");
    }

    public reset(): void {
        this.channels.reset();
        this.connection.reset();
        this.authManager.reset();
        this.optionManager.reset();
    }
}
