import { Socket } from '../../src/core/socket';
import { Rest } from '../../src/core/rest';

describe('Instance ID Integration', () => {
    // Track instances for cleanup
    const socketInstances: Socket[] = [];
    const restInstances: Rest[] = [];

    afterEach(() => {
        socketInstances.forEach(socket => {
            try {
                socket.reset();
            } catch (error) {
                // Ignore cleanup errors
            }
        });
        socketInstances.length = 0;

        restInstances.forEach(rest => {
            try {
                rest.reset();
            } catch (error) {
                // Ignore cleanup errors
            }
        });
        restInstances.length = 0;
    });

    describe('Socket instance ID with real services', () => {
        it('should maintain instance ID across service interactions', () => {
            const socket = new Socket({ autoConnect: false, apiKey: 'test-key' });
            socketInstances.push(socket);

            const instanceId = socket.getInstanceId();

            // Instance ID should be accessible from all service interactions
            expect(socket.getInstanceId()).toBe(instanceId);
            expect(socket.connection).toBeDefined();
            expect(socket.getInstanceId()).toBe(instanceId);
            expect(socket.channels).toBeDefined();
            expect(socket.getInstanceId()).toBe(instanceId);
            expect(socket.auth).toBeDefined();
            expect(socket.getInstanceId()).toBe(instanceId);
        });

        it('should maintain instance ID after option changes', () => {
            const socket = new Socket({ autoConnect: false, apiKey: 'test-key' });
            socketInstances.push(socket);

            const instanceId = socket.getInstanceId();

            // Change options
            socket.optionManager.setOption({ autoConnect: true });
            socket.optionManager.setOption({ apiKey: 'new-key' });

            // Instance ID should remain the same
            expect(socket.getInstanceId()).toBe(instanceId);
        });

        it('should maintain instance ID through reset', () => {
            const socket = new Socket({ autoConnect: false, apiKey: 'test-key' });
            socketInstances.push(socket);

            const instanceId = socket.getInstanceId();

            // Reset the socket
            socket.reset();

            // Instance ID should still be the same
            expect(socket.getInstanceId()).toBe(instanceId);
        });
    });

    describe('Rest instance ID with real services', () => {
        it('should maintain instance ID across service interactions', () => {
            const rest = new Rest({ apiKey: 'test-key' });
            restInstances.push(rest);

            const instanceId = rest.getInstanceId();

            // Instance ID should be accessible from all service interactions
            expect(rest.getInstanceId()).toBe(instanceId);
            expect(rest.channels).toBeDefined();
            expect(rest.getInstanceId()).toBe(instanceId);
            expect(rest.optionManager).toBeDefined();
            expect(rest.getInstanceId()).toBe(instanceId);
        });

        it('should maintain instance ID after option changes', () => {
            const rest = new Rest({ apiKey: 'test-key' });
            restInstances.push(rest);

            const instanceId = rest.getInstanceId();

            // Change options
            rest.optionManager.setOption({ apiKey: 'new-key' });

            // Instance ID should remain the same
            expect(rest.getInstanceId()).toBe(instanceId);
        });

        it('should maintain instance ID through reset', () => {
            const rest = new Rest({ apiKey: 'test-key' });
            restInstances.push(rest);

            const instanceId = rest.getInstanceId();

            // Reset the rest instance
            rest.reset();

            // Instance ID should still be the same
            expect(rest.getInstanceId()).toBe(instanceId);
        });
    });

    describe('Multi-instance tracking', () => {
        it('should track multiple Socket instances by ID', () => {
            const instanceRegistry = new Map<string, Socket>();

            // Create multiple sockets
            for (let i = 0; i < 5; i++) {
                const socket = new Socket({ autoConnect: false, apiKey: `key-${i}` });
                socketInstances.push(socket);
                instanceRegistry.set(socket.getInstanceId(), socket);
            }

            // Should have 5 unique instances
            expect(instanceRegistry.size).toBe(5);

            // Each instance should be retrievable by its ID
            socketInstances.forEach(socket => {
                const retrieved = instanceRegistry.get(socket.getInstanceId());
                expect(retrieved).toBe(socket);
            });
        });

        it('should track multiple Rest instances by ID', () => {
            const instanceRegistry = new Map<string, Rest>();

            // Create multiple rest instances
            for (let i = 0; i < 5; i++) {
                const rest = new Rest({ apiKey: `key-${i}` });
                restInstances.push(rest);
                instanceRegistry.set(rest.getInstanceId(), rest);
            }

            // Should have 5 unique instances
            expect(instanceRegistry.size).toBe(5);

            // Each instance should be retrievable by its ID
            restInstances.forEach(rest => {
                const retrieved = instanceRegistry.get(rest.getInstanceId());
                expect(retrieved).toBe(rest);
            });
        });

        it('should track mixed Socket and Rest instances', () => {
            const instanceRegistry = new Map<string, Socket | Rest>();

            // Create mixed instances
            const socket1 = new Socket({ autoConnect: false, apiKey: 'key-1' });
            const rest1 = new Rest({ apiKey: 'key-2' });
            const socket2 = new Socket({ autoConnect: false, apiKey: 'key-3' });
            const rest2 = new Rest({ apiKey: 'key-4' });

            socketInstances.push(socket1, socket2);
            restInstances.push(rest1, rest2);

            instanceRegistry.set(socket1.getInstanceId(), socket1);
            instanceRegistry.set(rest1.getInstanceId(), rest1);
            instanceRegistry.set(socket2.getInstanceId(), socket2);
            instanceRegistry.set(rest2.getInstanceId(), rest2);

            // Should have 4 unique instances
            expect(instanceRegistry.size).toBe(4);

            // Verify types by prefix
            const socketIds = Array.from(instanceRegistry.keys()).filter(id => id.startsWith('socket_'));
            const restIds = Array.from(instanceRegistry.keys()).filter(id => id.startsWith('rest_'));

            expect(socketIds.length).toBe(2);
            expect(restIds.length).toBe(2);
        });
    });

    describe('Real-world usage scenarios', () => {
        it('should support instance-based logging', () => {
            const logs: string[] = [];

            const socket = new Socket({ autoConnect: false, apiKey: 'test-key' });
            socketInstances.push(socket);

            const instanceId = socket.getInstanceId();

            // Simulate logging throughout lifecycle
            logs.push(`[${instanceId}] Instance created`);
            logs.push(`[${instanceId}] Configuring options`);
            socket.optionManager.setOption({ autoConnect: true });
            logs.push(`[${instanceId}] Options updated`);

            // All logs should have the same instance ID
            logs.forEach(log => {
                expect(log).toContain(instanceId);
            });
        });

        it('should support instance-based error tracking', () => {
            const errors: Array<{ instanceId: string; message: string; type: 'socket' | 'rest' }> = [];

            const socket = new Socket({ autoConnect: false, apiKey: 'test-key' });
            const rest = new Rest({ apiKey: 'test-key' });

            socketInstances.push(socket);
            restInstances.push(rest);

            // Simulate error tracking
            errors.push({
                instanceId: socket.getInstanceId(),
                message: 'Connection failed',
                type: 'socket'
            });

            errors.push({
                instanceId: rest.getInstanceId(),
                message: 'Request failed',
                type: 'rest'
            });

            expect(errors.length).toBe(2);
            expect(errors[0].instanceId).toMatch(/^socket_/);
            expect(errors[1].instanceId).toMatch(/^rest_/);
        });
    });
});

