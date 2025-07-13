import { ChannelProps } from "../context/types";
import { useChannel } from "../hooks/useChannel";

export function Channel({ name, children }: ChannelProps) {
    const channelState = useChannel(name);

    return children(channelState);
}
