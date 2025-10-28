import { UseChannelReturn } from "../context/types";
/**
 * React hook that provides a thin wrapper around the core SocketChannel.
 *
 * This follows the SDK's design - no automatic subscriptions, just manual control.
 * Use the subscribe() method to manually subscribe with your callback.
 *
 * Example usage (following SDK examples):
 * ```
 * const { status, subscribe, unsubscribe } = useChannel("my-channel");
 *
 * useEffect(() => {
 *     if (status === "initialized") {
 *         subscribe(handleMessage);
 *     }
 * }, [status, subscribe, handleMessage]);
 * ```
 */
export declare function useChannel(channelName: string): UseChannelReturn;
//# sourceMappingURL=useChannel.d.ts.map