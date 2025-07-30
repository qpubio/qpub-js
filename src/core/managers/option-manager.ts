import { DEFAULT_OPTIONS, Option } from "../../interfaces/option.interface";

class OptionManager {
    private static instances: Map<string, OptionManager> = new Map();
    private instanceId: string;
    private options: Option = { ...DEFAULT_OPTIONS };

    private constructor(instanceId: string, options?: Partial<Option>) {
        this.instanceId = instanceId;
        this.options = options
            ? { ...DEFAULT_OPTIONS, ...options }
            : DEFAULT_OPTIONS;
    }

    public static getInstance(
        instanceId: string,
        options?: Partial<Option>
    ): OptionManager {
        if (!OptionManager.instances.has(instanceId)) {
            OptionManager.instances.set(
                instanceId,
                new OptionManager(instanceId, options)
            );
        }
        return OptionManager.instances.get(instanceId)!;
    }

    public getOption(): Option;
    public getOption<K extends keyof Option>(optionName: K): Option[K];
    public getOption<K extends keyof Option>(optionName?: K) {
        return optionName ? this.options[optionName] : this.options;
    }

    public setOption(newOption: Partial<Option>): void {
        this.options = { ...this.options, ...newOption };
    }

    public reset(): void {
        OptionManager.instances.delete(this.instanceId);
    }
}

export { OptionManager };
