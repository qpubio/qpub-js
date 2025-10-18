import { OptionManager } from '../../src/core/managers/option-manager';
import { DEFAULT_OPTIONS } from '../../src/types/config/options';

describe('OptionManager', () => {
    let optionManager: OptionManager;

    beforeEach(() => {
        optionManager = new OptionManager();
    });

    describe('constructor', () => {
        it('should initialize with default options when no options provided', () => {
            const manager = new OptionManager();
            expect(manager.getOption()).toEqual(DEFAULT_OPTIONS);
        });

        it('should merge provided options with defaults', () => {
            const customOptions = { apiKey: 'test-key', autoConnect: false };
            const manager = new OptionManager(customOptions);
            
            const result = manager.getOption();
            expect(result.apiKey).toBe('test-key');
            expect(result.autoConnect).toBe(false);
            expect(result.wsHost).toBe(DEFAULT_OPTIONS.wsHost); // Should inherit default
        });

        it('should not mutate the provided options object', () => {
            const customOptions = { apiKey: 'test-key' };
            const originalOptions = { ...customOptions };
            
            new OptionManager(customOptions);
            
            expect(customOptions).toEqual(originalOptions);
        });
    });

    describe('getOption', () => {
        beforeEach(() => {
            optionManager.setOption({ apiKey: 'test-key', autoConnect: false });
        });

        it('should return all options when called without parameters', () => {
            const options = optionManager.getOption();
            expect(options).toHaveProperty('apiKey', 'test-key');
            expect(options).toHaveProperty('autoConnect', false);
            expect(options).toHaveProperty('wsHost'); // Should have all default props
        });

        it('should return specific option when called with key', () => {
            expect(optionManager.getOption('apiKey')).toBe('test-key');
            expect(optionManager.getOption('autoConnect')).toBe(false);
        });

        it('should return undefined for non-existent keys', () => {
            // TypeScript should prevent this, but test runtime behavior
            expect(optionManager.getOption('nonExistent' as any)).toBeUndefined();
        });
    });

    describe('setOption', () => {
        it('should update existing options', () => {
            optionManager.setOption({ apiKey: 'new-key' });
            expect(optionManager.getOption('apiKey')).toBe('new-key');
        });

        it('should add new options while preserving existing ones', () => {
            optionManager.setOption({ apiKey: 'test-key' });
            optionManager.setOption({ autoConnect: false });
            
            expect(optionManager.getOption('apiKey')).toBe('test-key');
            expect(optionManager.getOption('autoConnect')).toBe(false);
        });

        it('should handle multiple options at once', () => {
            const newOptions = {
                apiKey: 'bulk-key',
                autoConnect: true,
                wsHost: 'custom-host'
            };
            
            optionManager.setOption(newOptions);
            
            expect(optionManager.getOption('apiKey')).toBe('bulk-key');
            expect(optionManager.getOption('autoConnect')).toBe(true);
            expect(optionManager.getOption('wsHost')).toBe('custom-host');
        });

        it('should not mutate the input object', () => {
            const newOptions = { apiKey: 'test-key' };
            const originalOptions = { ...newOptions };
            
            optionManager.setOption(newOptions);
            
            expect(newOptions).toEqual(originalOptions);
        });
    });

    describe('reset', () => {
        it('should reset options to defaults', () => {
            // Set some custom options
            optionManager.setOption({
                apiKey: 'custom-key',
                autoConnect: false,
                wsHost: 'custom-host'
            });
            
            // Verify they were set
            expect(optionManager.getOption('apiKey')).toBe('custom-key');
            
            // Reset
            optionManager.reset();
            
            // Verify reset to defaults
            expect(optionManager.getOption()).toEqual(DEFAULT_OPTIONS);
        });

        it('should reset even after multiple option changes', () => {
            optionManager.setOption({ apiKey: 'key1' });
            optionManager.setOption({ autoConnect: false });
            optionManager.setOption({ wsHost: 'host1' });
            
            optionManager.reset();
            
            expect(optionManager.getOption()).toEqual(DEFAULT_OPTIONS);
        });
    });

    describe('edge cases', () => {
        it('should handle empty object in setOption', () => {
            const originalOptions = optionManager.getOption();
            optionManager.setOption({});
            expect(optionManager.getOption()).toEqual(originalOptions);
        });

        it('should handle null/undefined values gracefully', () => {
            // TypeScript should prevent this, but test runtime behavior
            expect(() => {
                optionManager.setOption({ apiKey: null as any });
            }).not.toThrow();
            
            expect(optionManager.getOption('apiKey')).toBeNull();
        });
    });
}); 