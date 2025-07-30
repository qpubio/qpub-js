import { ServiceContainer } from '../../src/core/shared/service-container';

describe('ServiceContainer', () => {
    let container: ServiceContainer;

    beforeEach(() => {
        container = new ServiceContainer('test-container');
    });

    describe('basic functionality', () => {
        it('should create a container with correct instance ID', () => {
            expect(container.getInstanceId()).toBe('test-container');
        });

        it('should register and resolve services', () => {
            // Register a simple service
            container.register('testService', () => ({ value: 'test' }), { lifetime: 'singleton' });

            expect(container.isRegistered('testService')).toBe(true);

            const service = container.resolve('testService');
            expect(service).toEqual({ value: 'test' });
        });

        it('should return the same instance for singleton services', () => {
            container.register('singleton', () => ({ id: Math.random() }), { lifetime: 'singleton' });

            const instance1 = container.resolve('singleton');
            const instance2 = container.resolve('singleton');

            expect(instance1).toBe(instance2);
        });

        it('should return different instances for transient services', () => {
            container.register('transient', () => ({ id: Math.random() }), { lifetime: 'transient' });

            const instance1 = container.resolve('transient');
            const instance2 = container.resolve('transient');

            expect(instance1).not.toBe(instance2);
        });

        it('should handle service dependencies', () => {
            // Register dependency
            container.register('dependency', () => ({ name: 'dep' }), { lifetime: 'singleton' });
            
            // Register service that uses dependency
            container.register('service', (c) => {
                const dep = c.resolve('dependency');
                return { dependency: dep, name: 'service' };
            }, { lifetime: 'singleton' });

            const service = container.resolve('service') as { dependency: any; name: string };
            expect(service.dependency).toEqual({ name: 'dep' });
            expect(service.name).toBe('service');
        });

        it('should throw error for unregistered services', () => {
            expect(() => container.resolve('nonexistent')).toThrow();
        });

        it('should clear instances correctly', () => {
            container.register('testService', () => ({ id: Math.random() }), { lifetime: 'singleton' });
            
            const instance1 = container.resolve('testService');
            expect(container.isInstantiated('testService')).toBe(true);
            
            container.clearInstances();
            expect(container.isInstantiated('testService')).toBe(false);
            
            const instance2 = container.resolve('testService');
            expect(instance1).not.toBe(instance2);
        });

        it('should detect circular dependencies', () => {
            container.register('serviceA', (c) => {
                const b = c.resolve('serviceB');
                return { b };
            }, { lifetime: 'singleton' });

            container.register('serviceB', (c) => {
                const a = c.resolve('serviceA');
                return { a };
            }, { lifetime: 'singleton' });

            expect(() => container.resolve('serviceA')).toThrow(/circular dependency/i);
        });

        it('should list registered services', () => {
            container.register('service1', () => ({}), { lifetime: 'singleton' });
            container.register('service2', () => ({}), { lifetime: 'transient' });

            const services = container.getRegisteredServices();
            expect(services).toContain('service1');
            expect(services).toContain('service2');
            expect(services).toHaveLength(2);
        });

        it('should reset container completely', () => {
            container.register('testService', () => ({ value: 'test' }), { lifetime: 'singleton' });
            container.resolve('testService');

            expect(container.isRegistered('testService')).toBe(true);
            expect(container.isInstantiated('testService')).toBe(true);

            container.reset();

            expect(container.isRegistered('testService')).toBe(false);
            expect(container.isInstantiated('testService')).toBe(false);
            expect(container.getRegisteredServices()).toHaveLength(0);
        });
    });

    describe('validation', () => {
        it('should validate successfully with proper registrations', () => {
            container.register('service1', () => ({ name: 'service1' }), { lifetime: 'singleton' });
            container.register('service2', (c) => {
                const s1 = c.resolve('service1');
                return { service1: s1, name: 'service2' };
            }, { lifetime: 'singleton' });

            expect(() => container.validate()).not.toThrow();
        });

        it('should detect missing dependencies during resolution', () => {
            container.register('service', (c) => {
                const missing = c.resolve('nonexistent');
                return { missing };
            }, { lifetime: 'singleton' });

            // The error occurs during resolution, not validation
            expect(() => container.resolve('service')).toThrow();
        });
    });
}); 