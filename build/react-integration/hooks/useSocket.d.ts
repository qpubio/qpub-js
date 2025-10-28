import { Socket } from "../../core/socket";
import { Option } from "../../types/config/options";
/**
 * Hook to create and manage a Socket instance directly with options
 * Can be used without a provider for direct Socket access
 *
 * @param options - Socket options including apiKey
 * @returns Socket instance or null if not in client environment
 */
export declare function useSocket(options?: Partial<Option>): Socket | null;
//# sourceMappingURL=useSocket.d.ts.map