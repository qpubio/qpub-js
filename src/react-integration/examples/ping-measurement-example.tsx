import React from "react";
import { SocketProvider } from "../components/SocketProvider";
import { useConnection } from "../hooks/useConnection";

/**
 * Example component demonstrating simple ping functionality with periodic pinging
 */
function PingMeasurementDemo() {
    const { status, connect, disconnect, isConnected, ping } = useConnection();
    const [lastRTT, setLastRTT] = React.useState<number | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isPeriodicPingEnabled, setIsPeriodicPingEnabled] =
        React.useState(false);
    const [pingHistory, setPingHistory] = React.useState<number[]>([]);
    const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
    ``;

    const handleConnect = () => {
        connect().catch(console.error);
    };

    const handleDisconnect = () => {
        disconnect();
    };

    const handlePing = async () => {
        if (!isConnected()) return;

        setIsLoading(true);
        try {
            const rtt = await ping();
            setLastRTT(rtt);
            // Keep history of last 10 pings
            setPingHistory((prev) => [...prev.slice(-9), rtt]);
        } catch (error) {
            console.error("Ping failed:", error);
            setLastRTT(null);
        } finally {
            setIsLoading(false);
        }
    };

    const startPeriodicPing = () => {
        if (intervalRef.current) return; // Already running

        setIsPeriodicPingEnabled(true);
        intervalRef.current = setInterval(async () => {
            if (isConnected()) {
                try {
                    const rtt = await ping();
                    setLastRTT(rtt);
                    setPingHistory((prev) => [...prev.slice(-9), rtt]);
                } catch (error) {
                    console.error("Periodic ping failed:", error);
                }
            }
        }, 5000); // Ping every 5 seconds
    };

    const stopPeriodicPing = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsPeriodicPingEnabled(false);
    };

    // Cleanup interval on unmount or disconnect
    React.useEffect(() => {
        if (!isConnected()) {
            stopPeriodicPing();
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isConnected()]);

    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
            <h2>Ping Measurement Demo</h2>

            <div style={{ marginBottom: "20px" }}>
                <h3>Connection Status</h3>
                <p>
                    Status: <strong>{status}</strong>
                </p>
                <p>
                    Connected: <strong>{isConnected() ? "Yes" : "No"}</strong>
                </p>

                <div style={{ marginTop: "10px" }}>
                    <button
                        onClick={handleConnect}
                        disabled={isConnected()}
                        style={{ marginRight: "10px" }}
                    >
                        Connect
                    </button>
                    <button
                        onClick={handleDisconnect}
                        disabled={!isConnected()}
                    >
                        Disconnect
                    </button>
                    <button
                        onClick={handlePing}
                        disabled={!isConnected() || isLoading}
                        style={{ marginLeft: "10px" }}
                    >
                        {isLoading ? "Pinging..." : "Ping Server"}
                    </button>
                </div>

                <div style={{ marginTop: "10px" }}>
                    <button
                        onClick={
                            isPeriodicPingEnabled
                                ? stopPeriodicPing
                                : startPeriodicPing
                        }
                        disabled={!isConnected()}
                        style={{
                            backgroundColor: isPeriodicPingEnabled
                                ? "#ff6b6b"
                                : "#51cf66",
                            color: "white",
                            border: "none",
                            padding: "8px 16px",
                            borderRadius: "4px",
                            cursor: isConnected() ? "pointer" : "not-allowed",
                        }}
                    >
                        {isPeriodicPingEnabled
                            ? "Stop Auto Ping (5s)"
                            : "Start Auto Ping (5s)"}
                    </button>
                </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
                <h3>Ping Measurement</h3>
                <div>
                    <p>
                        <strong>Last RTT:</strong>{" "}
                        {lastRTT !== null
                            ? `${lastRTT.toFixed(2)}ms`
                            : 'Click "Ping Server" to measure latency'}
                    </p>

                    {/* Average RTT */}
                    {pingHistory.length > 0 && (
                        <p>
                            <strong>Average RTT:</strong>{" "}
                            {(
                                pingHistory.reduce((sum, rtt) => sum + rtt, 0) /
                                pingHistory.length
                            ).toFixed(2)}
                            ms ({pingHistory.length} samples)
                        </p>
                    )}

                    {/* Connection Quality Indicator */}
                    {lastRTT !== null && (
                        <div style={{ marginTop: "10px" }}>
                            <strong>Connection Quality:</strong>{" "}
                            <span
                                style={{
                                    color:
                                        lastRTT < 50
                                            ? "green"
                                            : lastRTT < 150
                                              ? "orange"
                                              : "red",
                                    fontWeight: "bold",
                                }}
                            >
                                {lastRTT < 50
                                    ? "Excellent"
                                    : lastRTT < 150
                                      ? "Good"
                                      : "Poor"}
                            </span>
                        </div>
                    )}

                    {/* Periodic ping status */}
                    {isPeriodicPingEnabled && (
                        <p
                            style={{
                                color: "#51cf66",
                                fontStyle: "italic",
                                fontSize: "14px",
                            }}
                        >
                            🔄 Auto-pinging every 5 seconds...
                        </p>
                    )}

                    {!isConnected() && (
                        <p style={{ color: "#999", fontStyle: "italic" }}>
                            Connect to the server to measure ping latency
                        </p>
                    )}
                </div>
            </div>

            {/* Ping History Chart */}
            {pingHistory.length > 1 && (
                <div style={{ marginBottom: "20px" }}>
                    <h3>RTT History</h3>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "end",
                            height: "100px",
                            gap: "2px",
                            padding: "10px",
                            backgroundColor: "#f8f9fa",
                            borderRadius: "4px",
                        }}
                    >
                        {pingHistory.map((rtt, index) => {
                            const maxRTT = Math.max(...pingHistory);
                            const height = Math.max((rtt / maxRTT) * 80, 5); // Min 5px height
                            return (
                                <div
                                    key={index}
                                    style={{
                                        width: "20px",
                                        height: `${height}px`,
                                        backgroundColor:
                                            rtt < 50
                                                ? "#51cf66"
                                                : rtt < 150
                                                  ? "#ffd43b"
                                                  : "#ff6b6b",
                                        borderRadius: "2px",
                                        position: "relative",
                                    }}
                                    title={`${rtt.toFixed(2)}ms`}
                                />
                            );
                        })}
                    </div>
                    <p
                        style={{
                            fontSize: "12px",
                            color: "#666",
                            margin: "5px 0 0 0",
                        }}
                    >
                        Last {pingHistory.length} pings • Hover bars for exact
                        values
                    </p>
                </div>
            )}

            <div>
                <h3>How It Works</h3>
                <ul style={{ textAlign: "left", maxWidth: "600px" }}>
                    <li>
                        <strong>Manual Ping:</strong> Click "Ping Server" for
                        instant measurement
                    </li>
                    <li>
                        <strong>Auto Ping:</strong> Enable periodic pings every
                        5 seconds for continuous monitoring
                    </li>
                    <li>
                        <strong>Smart Tracking:</strong> Keeps history of last
                        10 pings with average calculation
                    </li>
                    <li>
                        <strong>Visual Feedback:</strong> Color-coded quality
                        indicators and RTT history chart
                    </li>
                    <li>
                        <strong>Promise-based:</strong> Clean async/await
                        pattern with error handling
                    </li>
                    <li>
                        <strong>Efficient:</strong> Uses sequential ping IDs for
                        reliable response matching
                    </li>
                </ul>
            </div>
        </div>
    );
}

/**
 * Full example with SocketProvider wrapper
 */
export function PingMeasurementExample() {
    return (
        <SocketProvider
            options={{
                autoConnect: false, // Start disconnected for demo
            }}
        >
            <PingMeasurementDemo />
        </SocketProvider>
    );
}

export default PingMeasurementExample;
