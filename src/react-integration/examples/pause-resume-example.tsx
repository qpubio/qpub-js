import React, { useEffect, useState } from "react";
import { useChannel } from "../hooks/useChannel";
import { ChannelEvents } from "../../types/events/constants";

/**
 * Example demonstrating channel pause/resume functionality
 *
 * This example shows:
 * 1. Basic pause/resume controls
 * 2. Message buffering
 * 3. Event tracking
 * 4. Auto-pause on document visibility change
 */
export function PauseResumeExample() {
    const {
        channel,
        subscribe,
        pause,
        resume,
        paused,
        clearBufferedMessages,
        status,
    } = useChannel("demo-channel");

    const [messages, setMessages] = useState<any[]>([]);
    const [pauseEvents, setPauseEvents] = useState<any[]>([]);
    const [resumeEvents, setResumeEvents] = useState<any[]>([]);
    const [bufferMode, setBufferMode] = useState(true);

    // Subscribe to messages
    useEffect(() => {
        if (status === "subscribed") {
            const handleMessage = (message: any) => {
                setMessages((prev) => [
                    ...prev,
                    {
                        ...message,
                        receivedAt: new Date().toISOString(),
                    },
                ]);
            };

            subscribe(handleMessage);
        }
    }, [status, subscribe]);

    // Listen to pause/resume events
    useEffect(() => {
        if (!channel) return;

        const handlePaused = (payload: any) => {
            setPauseEvents((prev) => [
                ...prev,
                {
                    ...payload,
                    timestamp: new Date().toISOString(),
                },
            ]);
        };

        const handleResumed = (payload: any) => {
            setResumeEvents((prev) => [
                ...prev,
                {
                    ...payload,
                    timestamp: new Date().toISOString(),
                },
            ]);
        };

        channel.on(ChannelEvents.PAUSED, handlePaused);
        channel.on(ChannelEvents.RESUMED, handleResumed);

        return () => {
            channel.off(ChannelEvents.PAUSED, handlePaused);
            channel.off(ChannelEvents.RESUMED, handleResumed);
        };
    }, [channel]);

    // Auto-pause when document is hidden
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!channel) return;

            if (document.hidden && !paused) {
                console.log("[Auto] Document hidden - pausing channel");
                pause({ bufferMessages: bufferMode });
            } else if (!document.hidden && paused) {
                console.log("[Auto] Document visible - resuming channel");
                resume();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
        };
    }, [channel, pause, resume, paused, bufferMode]);

    const handlePause = () => {
        pause({ bufferMessages: bufferMode });
    };

    const handleResume = () => {
        resume();
    };

    const handleClearBuffer = () => {
        clearBufferedMessages();
    };

    const handleClearMessages = () => {
        setMessages([]);
    };

    const handleClearEvents = () => {
        setPauseEvents([]);
        setResumeEvents([]);
    };

    const lastResumeEvent = resumeEvents[resumeEvents.length - 1];

    return (
        <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
            <h2>Channel Pause/Resume Demo</h2>

            {/* Status Section */}
            <div
                style={{
                    padding: "15px",
                    marginBottom: "20px",
                    backgroundColor: "#f5f5f5",
                    borderRadius: "8px",
                }}
            >
                <h3>Status</h3>
                <p>
                    <strong>Channel Status:</strong> {status}
                </p>
                <p>
                    <strong>Paused:</strong>{" "}
                    <span
                        style={{
                            color: paused ? "#e74c3c" : "#27ae60",
                            fontWeight: "bold",
                        }}
                    >
                        {paused ? "YES" : "NO"}
                    </span>
                </p>
                <p>
                    <strong>Buffer Mode:</strong>{" "}
                    {bufferMode ? "Enabled" : "Disabled"}
                </p>
                {lastResumeEvent && (
                    <p>
                        <strong>Last Resume:</strong>{" "}
                        {lastResumeEvent.bufferedMessagesDelivered} buffered
                        message(s) delivered
                    </p>
                )}
            </div>

            {/* Controls */}
            <div style={{ marginBottom: "20px" }}>
                <h3>Controls</h3>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                        onClick={handlePause}
                        disabled={paused || status !== "subscribed"}
                        style={{
                            padding: "10px 20px",
                            backgroundColor: paused ? "#ccc" : "#e74c3c",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: paused ? "not-allowed" : "pointer",
                        }}
                    >
                        Pause Channel
                    </button>

                    <button
                        onClick={handleResume}
                        disabled={!paused}
                        style={{
                            padding: "10px 20px",
                            backgroundColor: !paused ? "#ccc" : "#27ae60",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: !paused ? "not-allowed" : "pointer",
                        }}
                    >
                        Resume Channel
                    </button>

                    <button
                        onClick={handleClearBuffer}
                        disabled={!paused}
                        style={{
                            padding: "10px 20px",
                            backgroundColor: !paused ? "#ccc" : "#f39c12",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: !paused ? "not-allowed" : "pointer",
                        }}
                    >
                        Clear Buffer
                    </button>
                </div>

                <div style={{ marginTop: "15px" }}>
                    <label
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={bufferMode}
                            onChange={(e) => setBufferMode(e.target.checked)}
                        />
                        <span>Buffer messages when paused</span>
                    </label>
                    <p
                        style={{
                            fontSize: "12px",
                            color: "#666",
                            marginTop: "5px",
                        }}
                    >
                        {bufferMode
                            ? "Messages will be stored and delivered when resumed"
                            : "Messages will be dropped during pause"}
                    </p>
                </div>
            </div>

            {/* Messages Section */}
            <div style={{ marginBottom: "20px" }}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <h3>Received Messages ({messages.length})</h3>
                    <button
                        onClick={handleClearMessages}
                        style={{
                            padding: "5px 10px",
                            backgroundColor: "#95a5a6",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                        }}
                    >
                        Clear
                    </button>
                </div>
                <div
                    style={{
                        maxHeight: "200px",
                        overflowY: "auto",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        padding: "10px",
                        backgroundColor: "white",
                    }}
                >
                    {messages.length === 0 ? (
                        <p style={{ color: "#999" }}>
                            No messages received yet
                        </p>
                    ) : (
                        messages.map((msg, idx) => (
                            <div
                                key={idx}
                                style={{
                                    padding: "8px",
                                    marginBottom: "8px",
                                    backgroundColor: "#f9f9f9",
                                    borderLeft: "3px solid #3498db",
                                    borderRadius: "3px",
                                }}
                            >
                                <div
                                    style={{ fontSize: "12px", color: "#666" }}
                                >
                                    {msg.receivedAt}
                                </div>
                                <div style={{ marginTop: "4px" }}>
                                    {JSON.stringify(msg.data)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Events Section */}
            <div>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <h3>Events ({pauseEvents.length + resumeEvents.length})</h3>
                    <button
                        onClick={handleClearEvents}
                        style={{
                            padding: "5px 10px",
                            backgroundColor: "#95a5a6",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                        }}
                    >
                        Clear
                    </button>
                </div>
                <div
                    style={{
                        maxHeight: "150px",
                        overflowY: "auto",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        padding: "10px",
                        backgroundColor: "white",
                    }}
                >
                    {pauseEvents.length === 0 && resumeEvents.length === 0 ? (
                        <p style={{ color: "#999" }}>No events yet</p>
                    ) : (
                        <>
                            {pauseEvents.map((event, idx) => (
                                <div
                                    key={`pause-${idx}`}
                                    style={{
                                        padding: "8px",
                                        marginBottom: "8px",
                                        backgroundColor: "#ffebee",
                                        borderLeft: "3px solid #e74c3c",
                                        borderRadius: "3px",
                                    }}
                                >
                                    <strong>PAUSED</strong> - {event.timestamp}
                                    <br />
                                    <small>
                                        Buffering:{" "}
                                        {event.buffering ? "Yes" : "No"}
                                    </small>
                                </div>
                            ))}
                            {resumeEvents.map((event, idx) => (
                                <div
                                    key={`resume-${idx}`}
                                    style={{
                                        padding: "8px",
                                        marginBottom: "8px",
                                        backgroundColor: "#e8f5e9",
                                        borderLeft: "3px solid #27ae60",
                                        borderRadius: "3px",
                                    }}
                                >
                                    <strong>RESUMED</strong> - {event.timestamp}
                                    <br />
                                    <small>
                                        Buffered messages:{" "}
                                        {event.bufferedMessagesDelivered}
                                    </small>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* Instructions */}
            <div
                style={{
                    marginTop: "20px",
                    padding: "15px",
                    backgroundColor: "#e3f2fd",
                    borderRadius: "8px",
                    fontSize: "14px",
                }}
            >
                <h4 style={{ marginTop: 0 }}>Try it:</h4>
                <ol style={{ margin: "10px 0", paddingLeft: "20px" }}>
                    <li>Click "Pause Channel" to pause receiving messages</li>
                    <li>
                        Publish messages from another client (they'll be
                        buffered)
                    </li>
                    <li>
                        Click "Resume Channel" to receive all buffered messages
                        at once
                    </li>
                    <li>
                        Try disabling "Buffer messages" and pausing - messages
                        will be dropped
                    </li>
                    <li>
                        Switch to another tab - channel auto-pauses (check
                        events)
                    </li>
                </ol>
                <div
                    style={{
                        marginTop: "15px",
                        padding: "10px",
                        backgroundColor: "#fff3cd",
                        borderRadius: "4px",
                        fontSize: "13px",
                    }}
                >
                    <strong>💡 Tip:</strong> Use the reactive{" "}
                    <code>paused</code> state in useEffect dependencies, not{" "}
                    <code>isPaused()</code>:
                    <pre
                        style={{
                            marginTop: "8px",
                            padding: "8px",
                            backgroundColor: "#f5f5f5",
                            borderRadius: "3px",
                        }}
                    >
                        {`useEffect(() => {
  console.log('Paused changed:', paused);
}, [paused]); // ✅ Reactive state

// NOT: [isPaused] ❌ Function reference`}
                    </pre>
                </div>
            </div>
        </div>
    );
}
