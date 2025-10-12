import { SocketChannelManager } from "../../src/core/managers/channel-manager";
import { SocketChannel } from "../../src/core/channels/socket-channel";
import {
    IWebSocketClient,
    ILogger,
} from "../../src/interfaces/services.interface";

describe("SocketChannelManager", () => {
    // Track instances for cleanup
    const managerInstances: SocketChannelManager[] = [];

    // Helper function to create test mocks
    function createTestMocks() {
        const mockSocket = {
            readyState: WebSocket.OPEN as number,
            onopen: null as any,
            onclose: null as any,
            onerror: null as any,
            onmessage: null as any,
            close: jest.fn(),
            send: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
        };

        const wsClient = {
            connect: jest.fn(),
            disconnect: jest.fn(),
            isConnected: jest.fn().mockReturnValue(true),
            getSocket: jest.fn().mockReturnValue(mockSocket),
            send: jest.fn(),
            reset: jest.fn(),
        } as jest.Mocked<IWebSocketClient>;

        const logger = {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            debug: jest.fn(),
            trace: jest.fn(),
        } as jest.Mocked<ILogger>;

        return { wsClient, logger, mockSocket };
    }

    // Helper to create SocketChannelManager and track for cleanup
    function createChannelManager(
        mocks: ReturnType<typeof createTestMocks>
    ): SocketChannelManager {
        const { wsClient, logger } = mocks;
        const manager = new SocketChannelManager(wsClient, logger);
        managerInstances.push(manager);
        return manager;
    }

    // Cleanup after each test
    afterEach(() => {
        managerInstances.forEach((manager) => {
            manager.reset();
        });
        managerInstances.length = 0;
    });

    describe("Channel Creation and Management", () => {
        it("should create new channels on first access", () => {
            const mocks = createTestMocks();
            const manager = createChannelManager(mocks);

            expect(manager.has("test-channel")).toBe(false);

            const channel = manager.get("test-channel");

            expect(channel).toBeInstanceOf(SocketChannel);
            expect(channel.getName()).toBe("test-channel");
            expect(manager.has("test-channel")).toBe(true);
            expect(mocks.logger.debug).toHaveBeenCalledWith(
                "Creating new socket channel: test-channel"
            );
        });

        it("should return existing channel for subsequent access", () => {
            const mocks = createTestMocks();
            const manager = createChannelManager(mocks);

            const channel1 = manager.get("test-channel");
            const channel2 = manager.get("test-channel");

            expect(channel1).toBe(channel2);
            // Verify channel manager debug was called once for creation
            expect(mocks.logger.debug).toHaveBeenCalledWith(
                "Creating new socket channel: test-channel"
            );
        });

        it("should manage multiple channels independently", () => {
            const mocks = createTestMocks();
            const manager = createChannelManager(mocks);

            const channel1 = manager.get("channel-1");
            const channel2 = manager.get("channel-2");
            const channel3 = manager.get("channel-3");

            expect(channel1).not.toBe(channel2);
            expect(channel2).not.toBe(channel3);
            expect(channel1.getName()).toBe("channel-1");
            expect(channel2.getName()).toBe("channel-2");
            expect(channel3.getName()).toBe("channel-3");

            expect(manager.has("channel-1")).toBe(true);
            expect(manager.has("channel-2")).toBe(true);
            expect(manager.has("channel-3")).toBe(true);
            expect(manager.has("non-existent")).toBe(false);
        });

        it("should get all channels", () => {
            const mocks = createTestMocks();
            const manager = createChannelManager(mocks);

            expect(manager.getAllChannels()).toHaveLength(0);

            const channel1 = manager.get("channel-1");
            const channel2 = manager.get("channel-2");

            const allChannels = manager.getAllChannels();
            expect(allChannels).toHaveLength(2);
            expect(allChannels).toContain(channel1);
            expect(allChannels).toContain(channel2);
        });

        it("should remove channels properly", () => {
            const mocks = createTestMocks();
            const manager = createChannelManager(mocks);

            const channel = manager.get("test-channel");
            const removeListenersSpy = jest.spyOn(
                channel,
                "removeAllListeners"
            );

            expect(manager.has("test-channel")).toBe(true);

            manager.remove("test-channel");

            expect(manager.has("test-channel")).toBe(false);
            expect(removeListenersSpy).toHaveBeenCalled();
            expect(mocks.logger.debug).toHaveBeenCalledWith(
                "Channel test-channel removed"
            );
        });

        it("should handle removal of non-existent channel", () => {
            const mocks = createTestMocks();
            const manager = createChannelManager(mocks);

            // Should not throw error
            expect(() => manager.remove("non-existent")).not.toThrow();
        });
    });

    describe("Channel State Management", () => {
        it("should set all channels to pending subscribe", () => {
            const mocks = createTestMocks();
            const manager = createChannelManager(mocks);

            const channel1 = manager.get("channel-1");
            const channel2 = manager.get("channel-2");
            const channel3 = manager.get("channel-3");

            const setPendingSpy1 = jest.spyOn(channel1, "setPendingSubscribe");
            const setPendingSpy2 = jest.spyOn(channel2, "setPendingSubscribe");
            const setPendingSpy3 = jest.spyOn(channel3, "setPendingSubscribe");

            manager.pendingSubscribeAllChannels();

            expect(setPendingSpy1).toHaveBeenCalledWith(true);
            expect(setPendingSpy2).toHaveBeenCalledWith(true);
            expect(setPendingSpy3).toHaveBeenCalledWith(true);
        });

        it("should resubscribe all channels", async () => {
            const mocks = createTestMocks();
            const manager = createChannelManager(mocks);

            const channel1 = manager.get("channel-1");
            const channel2 = manager.get("channel-2");

            const resubscribeSpy1 = jest
                .spyOn(channel1, "resubscribe")
                .mockResolvedValue();
            const resubscribeSpy2 = jest
                .spyOn(channel2, "resubscribe")
                .mockResolvedValue();

            await manager.resubscribeAllChannels();

            expect(resubscribeSpy1).toHaveBeenCalled();
            expect(resubscribeSpy2).toHaveBeenCalled();
            expect(mocks.logger.debug).toHaveBeenCalledWith(
                "Resubscribing to 2 channels"
            );
            expect(mocks.logger.debug).toHaveBeenCalledWith(
                "Resubscribed to channel: channel-1"
            );
            expect(mocks.logger.debug).toHaveBeenCalledWith(
                "Resubscribed to channel: channel-2"
            );
        });

        it("should handle resubscribe errors gracefully", async () => {
            const mocks = createTestMocks();
            const manager = createChannelManager(mocks);

            const channel1 = manager.get("channel-1");
            const channel2 = manager.get("channel-2");

            const error = new Error("Resubscribe failed");
            jest.spyOn(channel1, "resubscribe").mockRejectedValue(error);
            jest.spyOn(channel2, "resubscribe").mockResolvedValue();

            await manager.resubscribeAllChannels();

            expect(mocks.logger.error).toHaveBeenCalledWith(
                "Failed to resubscribe to channel channel-1:",
                error
            );
            expect(mocks.logger.debug).toHaveBeenCalledWith(
                "Resubscribed to channel: channel-2"
            );
        });
    });

    describe("Reset and Cleanup", () => {
        it("should reset all channels and clear the collection", () => {
            const mocks = createTestMocks();
            const manager = createChannelManager(mocks);

            const channel1 = manager.get("channel-1");
            const channel2 = manager.get("channel-2");

            const resetSpy1 = jest.spyOn(channel1, "reset");
            const resetSpy2 = jest.spyOn(channel2, "reset");

            expect(manager.getAllChannels()).toHaveLength(2);

            manager.reset();

            expect(resetSpy1).toHaveBeenCalled();
            expect(resetSpy2).toHaveBeenCalled();
            expect(manager.getAllChannels()).toHaveLength(0);
            expect(manager.has("channel-1")).toBe(false);
            expect(manager.has("channel-2")).toBe(false);
            expect(mocks.logger.debug).toHaveBeenCalledWith(
                "Resetting all socket channels"
            );
        });

        it("should handle reset with no channels", () => {
            const mocks = createTestMocks();
            const manager = createChannelManager(mocks);

            expect(() => manager.reset()).not.toThrow();
            expect(mocks.logger.debug).toHaveBeenCalledWith(
                "Resetting all socket channels"
            );
        });
    });
});
