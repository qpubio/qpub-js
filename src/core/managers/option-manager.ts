import { DEFAULT_OPTIONS, Option } from "../../interfaces/option.interface";
import { IOptionManager } from "../../interfaces/services.interface";

export class OptionManager implements IOptionManager {
    private options: Option;

    constructor(options: Partial<Option> = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
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
        this.options = { ...DEFAULT_OPTIONS };
    }
}
