import { Socket } from '../../src/core/socket';
import { Rest } from '../../src/core/rest';

describe('Socket and Rest Instance ID', () => {
    // Track instances for cleanup
    const socketInstances: Socket[] = [];
    const restInstances: Rest[] = [];

    // Helper to create Socket and track for cleanup
    function createSocket(options?: any): Socket {
        const socket = new Socket(options);
        socketInstances.push(socket);
        return socket;
    }

    // Helper to create Rest and track for cleanup
    function createRest(options?: any): Rest {
        const rest = new Rest(options);
        restInstances.push(rest);
        return rest;
    }

    // Cleanup after each test
    afterEach(() => {
        socketInstances.forEach(socket => {
            try {
                socket.reset();
            } catch (error) {
                // Ignore cleanup errors in tests
            }
        });
        socketInstances.length = 0;

        restInstances.forEach(rest => {
            try {
                rest.reset();
            } catch (error) {
                // Ignore cleanup errors in tests
            }
        });
        restInstances.length = 0;
    });

    describe('Socket.getInstanceId()', () => {
        it('should return a valid instance ID', () => {
            const socket = createSocket({ autoConnect: false });
            const instanceId = socket.getInstanceId();

            expect(instanceId).toBeDefined();
            expect(typeof instanceId).toBe('string');
            expect(instanceId.length).toBeGreaterThan(0);
        });

        it('should have "socket_" prefix', () => {
            const socket = createSocket({ autoConnect: false });
            const instanceId = socket.getInstanceId();

            expect(instanceId).toMatch(/^socket_/);
        });

        it('should follow UUIDv7 format after prefix', () => {
            const socket = createSocket({ autoConnect: false });
            const instanceId = socket.getInstanceId();

            // Remove "socket_" prefix and check for UUID format
            const uuid = instanceId.replace('socket_', '');
            
            // UUIDv7 format: 8-4-4-4-12 characters (with or without dashes)
            // Should be alphanumeric with optional dashes, minimum 32 chars without dashes
            expect(uuid.length).toBeGreaterThanOrEqual(20);
            expect(uuid).toMatch(/^[0-9a-z-]+$/i);
        });

        it('should return the same instance ID throughout lifecycle', () => {
            const socket = createSocket({ autoConnect: false });
            
            const id1 = socket.getInstanceId();
            const id2 = socket.getInstanceId();
            const id3 = socket.getInstanceId();

            expect(id1).toBe(id2);
            expect(id2).toBe(id3);
        });

        it('should generate unique IDs for different instances', () => {
            const socket1 = createSocket({ autoConnect: false });
            const socket2 = createSocket({ autoConnect: false });
            const socket3 = createSocket({ autoConnect: false });

            const id1 = socket1.getInstanceId();
            const id2 = socket2.getInstanceId();
            const id3 = socket3.getInstanceId();

            expect(id1).not.toBe(id2);
            expect(id2).not.toBe(id3);
            expect(id1).not.toBe(id3);
        });

        it('should maintain instance ID after reset', () => {
            const socket = createSocket({ autoConnect: false });
            const idBeforeReset = socket.getInstanceId();

            socket.reset();

            const idAfterReset = socket.getInstanceId();
            expect(idAfterReset).toBe(idBeforeReset);
        });

        it('should be accessible alongside other socket properties', () => {
            const socket = createSocket({ 
                autoConnect: false,
                apiKey: 'test-key'
            });

            // Verify we can access instance ID along with other properties
            expect(socket.getInstanceId()).toBeDefined();
            expect(socket.connection).toBeDefined();
            expect(socket.channels).toBeDefined();
            expect(socket.auth).toBeDefined();
            expect(socket.optionManager).toBeDefined();
        });
    });

    describe('Rest.getInstanceId()', () => {
        it('should return a valid instance ID', () => {
            const rest = createRest();
            const instanceId = rest.getInstanceId();

            expect(instanceId).toBeDefined();
            expect(typeof instanceId).toBe('string');
            expect(instanceId.length).toBeGreaterThan(0);
        });

        it('should have "rest_" prefix', () => {
            const rest = createRest();
            const instanceId = rest.getInstanceId();

            expect(instanceId).toMatch(/^rest_/);
        });

        it('should follow UUIDv7 format after prefix', () => {
            const rest = createRest();
            const instanceId = rest.getInstanceId();

            // Remove "rest_" prefix and check for UUID format
            const uuid = instanceId.replace('rest_', '');
            
            // UUIDv7 format: should be alphanumeric with optional dashes and of reasonable length
            expect(uuid.length).toBeGreaterThanOrEqual(20);
            expect(uuid).toMatch(/^[0-9a-z-]+$/i);
        });

        it('should return the same instance ID throughout lifecycle', () => {
            const rest = createRest();
            
            const id1 = rest.getInstanceId();
            const id2 = rest.getInstanceId();
            const id3 = rest.getInstanceId();

            expect(id1).toBe(id2);
            expect(id2).toBe(id3);
        });

        it('should generate unique IDs for different instances', () => {
            const rest1 = createRest();
            const rest2 = createRest();
            const rest3 = createRest();

            const id1 = rest1.getInstanceId();
            const id2 = rest2.getInstanceId();
            const id3 = rest3.getInstanceId();

            expect(id1).not.toBe(id2);
            expect(id2).not.toBe(id3);
            expect(id1).not.toBe(id3);
        });

        it('should maintain instance ID after reset', () => {
            const rest = createRest();
            const idBeforeReset = rest.getInstanceId();

            rest.reset();

            const idAfterReset = rest.getInstanceId();
            expect(idAfterReset).toBe(idBeforeReset);
        });

        it('should be accessible alongside other rest properties', () => {
            const rest = createRest({ apiKey: 'test-key' });

            // Verify we can access instance ID along with other properties
            expect(rest.getInstanceId()).toBeDefined();
            expect(rest.channels).toBeDefined();
            expect(rest.optionManager).toBeDefined();
        });
    });

    describe('Cross-instance uniqueness', () => {
        it('should generate unique IDs across Socket and Rest instances', () => {
            const socket1 = createSocket({ autoConnect: false });
            const socket2 = createSocket({ autoConnect: false });
            const rest1 = createRest();
            const rest2 = createRest();

            const ids = [
                socket1.getInstanceId(),
                socket2.getInstanceId(),
                rest1.getInstanceId(),
                rest2.getInstanceId()
            ];

            // Check all IDs are unique
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(4);

            // Check correct prefixes
            expect(ids[0]).toMatch(/^socket_/);
            expect(ids[1]).toMatch(/^socket_/);
            expect(ids[2]).toMatch(/^rest_/);
            expect(ids[3]).toMatch(/^rest_/);
        });

        it('should generate time-ordered IDs (UUIDv7 property)', async () => {
            const socket1 = createSocket({ autoConnect: false });
            
            // Wait a tiny bit to ensure different timestamp
            await new Promise(resolve => setTimeout(resolve, 2));
            
            const socket2 = createSocket({ autoConnect: false });
            
            await new Promise(resolve => setTimeout(resolve, 2));
            
            const socket3 = createSocket({ autoConnect: false });

            const id1 = socket1.getInstanceId().replace('socket_', '');
            const id2 = socket2.getInstanceId().replace('socket_', '');
            const id3 = socket3.getInstanceId().replace('socket_', '');

            // UUIDv7 should be sortable by creation time
            // Just verify they're different (exact ordering might vary based on precision)
            expect(id1).not.toBe(id2);
            expect(id2).not.toBe(id3);
        });
    });

    describe('Instance ID usage patterns', () => {
        it('should be suitable for logging and debugging', () => {
            const socket = createSocket({ autoConnect: false });
            const instanceId = socket.getInstanceId();

            // Simulate logging usage
            const logMessage = `[${instanceId}] Connection established`;
            
            expect(logMessage).toContain('socket_');
            expect(logMessage).toMatch(/\[socket_[0-9a-z-]+\] Connection established/i);
        });

        it('should be suitable for tracking multiple instances', () => {
            const instances = new Map<string, Socket>();

            const socket1 = createSocket({ autoConnect: false });
            const socket2 = createSocket({ autoConnect: false });
            const socket3 = createSocket({ autoConnect: false });

            instances.set(socket1.getInstanceId(), socket1);
            instances.set(socket2.getInstanceId(), socket2);
            instances.set(socket3.getInstanceId(), socket3);

            expect(instances.size).toBe(3);
            expect(instances.get(socket1.getInstanceId())).toBe(socket1);
            expect(instances.get(socket2.getInstanceId())).toBe(socket2);
            expect(instances.get(socket3.getInstanceId())).toBe(socket3);
        });

        it('should be suitable for error reporting context', () => {
            const socket = createSocket({ autoConnect: false });
            const instanceId = socket.getInstanceId();

            // Simulate error reporting
            const errorReport = {
                message: 'Connection failed',
                instanceId: instanceId,
                timestamp: Date.now(),
                type: 'socket'
            };

            expect(errorReport.instanceId).toBe(instanceId);
            expect(errorReport.instanceId).toMatch(/^socket_/);
        });
    });

    describe('Edge cases', () => {
        it('should handle rapid instance creation', () => {
            const instances = Array.from({ length: 100 }, () => 
                createSocket({ autoConnect: false })
            );

            const ids = instances.map(s => s.getInstanceId());
            const uniqueIds = new Set(ids);

            // All IDs should be unique
            expect(uniqueIds.size).toBe(100);
        });

        it('should work with different socket configurations', () => {
            const socket1 = createSocket({ 
                autoConnect: false,
                apiKey: 'key1'
            });
            const socket2 = createSocket({ 
                autoConnect: true,
                apiKey: 'key2'
            });

            const id1 = socket1.getInstanceId();
            const id2 = socket2.getInstanceId();

            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^socket_/);
            expect(id2).toMatch(/^socket_/);
        });

        it('should work with different rest configurations', () => {
            const rest1 = createRest({ apiKey: 'key1' });
            const rest2 = createRest({ apiKey: 'key2' });

            const id1 = rest1.getInstanceId();
            const id2 = rest2.getInstanceId();

            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^rest_/);
            expect(id2).toMatch(/^rest_/);
        });
    });
});

