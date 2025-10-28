import { Option } from "../../types/config/options";
import { IOptionManager } from "../../types/services/managers";
export declare class OptionManager implements IOptionManager {
    private options;
    constructor(options?: Partial<Option>);
    getOption(): Option;
    getOption<K extends keyof Option>(optionName: K): Option[K];
    setOption(newOption: Partial<Option>): void;
    reset(): void;
}
//# sourceMappingURL=option-manager.d.ts.map