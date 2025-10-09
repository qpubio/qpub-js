import React, { useState, useCallback, useEffect } from "react";
import {
    SocketProvider,
    useChannel,
    useAuth,
    useConnection,
    Channel,
} from "../index";
import { Message } from "../../interfaces/message.interface";

// =============================================================================
// Example 1: Basic Socket Provider Usage
// =============================================================================

function BasicExample() {
    return (
        <SocketProvider
            options={{
                apiKey: "your-api-key",
                autoConnect: true,
            }}
        >
            <div className="socket-example">
                <h2>🔌 QPub Socket Integration</h2>
                <ConnectionStatus />
                <AuthSection />
                <ChatRoom />
            </div>
        </SocketProvider>
    );
}

function ConnectionStatus() {
    const { status, connectionId, connectionDetails, connect, isConnected, disconnect, reset } = useConnection();

    const getStatusColor = (status: string) => {
        switch (status) {
            case "connected":
                return "green";
            case "connecting":
                return "orange";
            case "failed":
                return "red";
            default:
                return "gray";
        }
    };

    return (
        <div className="connection-status">
            <h4>🔗 Connection</h4>
            <div style={{ color: getStatusColor(status) }}>
                Status: {status}
            </div>
            {connectionId && (
                <div style={{ fontSize: "12px", marginTop: "8px" }}>
                    <div>Connection ID: {connectionId}</div>
                    {connectionDetails && (
                        <>
                            <div>Client ID: {connectionDetails.client_id}</div>
                            <div>Server ID: {connectionDetails.server_id}</div>
                        </>
                    )}
                </div>
            )}
            <div>
                <button onClick={isConnected() ? disconnect : connect}>
                    {isConnected() ? "Disconnect" : "Connect"}
                </button>
                <button onClick={reset}>Reset</button>
            </div>
        </div>
    );
}

function AuthSection() {
    const {
        isAuthenticated,
        isAuthenticating,
        token,
        error,
        authenticate,
        clearToken,
    } = useAuth();

    return (
        <div className="auth-section">
            <h4>🔐 Authentication</h4>
            {isAuthenticated ? (
                <>
                    <div>✅ Authenticated</div>
                    <div>Token: {token?.substring(0, 20)}...</div>
                    <button onClick={clearToken}>Clear Token</button>
                </>
            ) : (
                <>
                    <div>❌ Not authenticated</div>
                    <button onClick={authenticate} disabled={isAuthenticating}>
                        {isAuthenticating
                            ? "Authenticating..."
                            : "Authenticate"}
                    </button>
                </>
            )}
            {error && (
                <div style={{ color: "red" }}>Error: {error.message}</div>
            )}
        </div>
    );
}

function ChatRoom() {
    const [messageText, setMessageText] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);

    const { status, error, publish, subscribe, unsubscribe, isSubscribed } =
        useChannel("chat-room");

    // Handle incoming messages
    const handleMessage = useCallback((message: Message) => {
        console.log("Message received:", message);
        setMessages((prev) => [...prev, message]);
    }, []);

    // Subscribe when channel is ready
    useEffect(() => {
        if (status === "initialized") {
            subscribe(handleMessage);
        }
    }, [status, subscribe, handleMessage]);

    const sendMessage = async () => {
        if (!messageText.trim()) return;

        try {
            await publish({
                text: messageText,
                timestamp: Date.now(),
                user: "demo-user",
            });
            setMessageText("");
        } catch (err) {
            console.error("Failed to send:", err);
        }
    };

    return (
        <div className="chat-room">
            <h4>💬 Chat Room</h4>
            <div>Channel status: {status}</div>
            <div>Subscribed: {isSubscribed() ? "✅" : "❌"}</div>

            <div className="controls">
                <button onClick={() => setMessages([])}>Clear Messages</button>
            </div>

            <div
                className="messages"
                style={{
                    height: "200px",
                    overflow: "auto",
                    border: "1px solid #ccc",
                    padding: "8px",
                    marginBottom: "8px",
                }}
            >
                {messages.map((msg, idx) => (
                    <div key={idx} style={{ marginBottom: "4px" }}>
                        <strong>{msg.data?.user}:</strong> {msg.data?.text}
                        <span style={{ color: "#999", fontSize: "12px" }}>
                            {" "}
                            (
                            {msg.timestamp
                                ? new Date(msg.timestamp).toLocaleTimeString()
                                : "No timestamp"}
                            )
                        </span>
                    </div>
                ))}
            </div>

            <div className="input" style={{ display: "flex", gap: "8px" }}>
                <input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type message..."
                    style={{ flex: 1 }}
                />
                <button onClick={sendMessage} disabled={!isSubscribed()}>
                    Send
                </button>
            </div>

            {error && (
                <div style={{ color: "red" }}>Error: {error.message}</div>
            )}
        </div>
    );
}

// =============================================================================
// Example 2: Channel Component Pattern
// =============================================================================

function ChannelComponentExample() {
    return (
        <SocketProvider options={{ apiKey: "your-api-key" }}>
            <div className="channel-example">
                <h2>📺 Channel Component Pattern</h2>

                <Channel name="notifications">
                    {({ status, publish, isSubscribed, error }) => (
                        <div className="notification-channel">
                            <h4>🔔 Notifications</h4>
                            <div>Status: {status}</div>
                            <div>
                                Subscribed: {isSubscribed() ? "✅" : "❌"}
                            </div>

                            <button
                                onClick={() =>
                                    publish({
                                        type: "info",
                                        message: "Test notification",
                                        timestamp: Date.now(),
                                    })
                                }
                                disabled={!isSubscribed()}
                            >
                                Send Test Notification
                            </button>

                            {error && (
                                <div style={{ color: "red" }}>
                                    Error: {error.message}
                                </div>
                            )}
                        </div>
                    )}
                </Channel>

                <Channel name="system-events">
                    {({ status, subscribe, unsubscribe, isSubscribed }) => (
                        <div className="system-events">
                            <h4>⚙️ System Events</h4>
                            <div>Status: {status}</div>

                            <button
                                onClick={() =>
                                    isSubscribed()
                                        ? unsubscribe()
                                        : subscribe((event: Message) =>
                                              console.log(
                                                  "System event:",
                                                  event
                                              )
                                          )
                                }
                            >
                                {isSubscribed() ? "Unsubscribe" : "Subscribe"}
                            </button>
                        </div>
                    )}
                </Channel>
            </div>
        </SocketProvider>
    );
}

// =============================================================================
// Example 3: Multiple Channels
// =============================================================================

function MultiChannelExample() {
    const notifications = useChannel("notifications");
    const chat = useChannel("chat");
    const events = useChannel("system-events");

    useEffect(() => {
        // Subscribe to different channels with different handlers
        if (notifications.status === "initialized") {
            notifications.subscribe((msg: Message) => {
                console.log("Notification:", msg);
                // Show toast notification
            });
        }

        if (chat.status === "initialized") {
            chat.subscribe((msg: Message) => {
                console.log("Chat message:", msg);
                // Add to chat messages
            });
        }

        if (events.status === "initialized") {
            events.subscribe((event: Message) => {
                console.log("System event:", event);
                // Log system events
            });
        }
    }, [
        notifications.status,
        chat.status,
        events.status,
        notifications.subscribe,
        chat.subscribe,
        events.subscribe,
    ]);

    return (
        <div className="multi-channel">
            <h4>📡 Multiple Channels</h4>
            <div>
                <div>
                    Notifications: {notifications.isSubscribed() ? "✓" : "✗"}
                </div>
                <div>Chat: {chat.isSubscribed() ? "✓" : "✗"}</div>
                <div>Events: {events.isSubscribed() ? "✓" : "✗"}</div>
            </div>

            <div style={{ marginTop: "16px" }}>
                <button
                    onClick={() =>
                        notifications.publish({ test: "notification" })
                    }
                >
                    Send Notification
                </button>
                <button onClick={() => chat.publish({ text: "Hello chat!" })}>
                    Send Chat Message
                </button>
                <button onClick={() => events.publish({ type: "test" })}>
                    Send Event
                </button>
            </div>
        </div>
    );
}

// =============================================================================
// Example 4: Error Handling
// =============================================================================

function ErrorHandlingExample() {
    return (
        <div className="error-example">
            <h2>🚨 Error Handling</h2>
            <ErrorBoundary>
                <SocketProvider
                    options={{ apiKey: "your-api-key" }}
                    fallback={({ error }) => (
                        <div style={{ color: "red" }}>
                            Provider Error: {error?.message}
                        </div>
                    )}
                >
                    <ErrorProneComponent />
                </SocketProvider>
            </ErrorBoundary>
        </div>
    );
}

function ErrorProneComponent() {
    const { error } = useChannel("test-channel");

    if (error) {
        return (
            <div style={{ color: "red" }}>Channel Error: {error.message}</div>
        );
    }

    return <div>✅ No errors</div>;
}

class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error: Error | null }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        color: "red",
                        padding: "16px",
                        border: "1px solid red",
                    }}
                >
                    <h4>Something went wrong:</h4>
                    <p>{this.state.error?.message}</p>
                    <button
                        onClick={() =>
                            this.setState({ hasError: false, error: null })
                        }
                    >
                        Reset
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

// =============================================================================
// Main App Component
// =============================================================================

export default function App() {
    const [activeExample, setActiveExample] = useState("basic");

    const examples = {
        basic: BasicExample,
        channel: ChannelComponentExample,
        multi: MultiChannelExample,
        error: ErrorHandlingExample,
    };

    const ExampleComponent = examples[activeExample as keyof typeof examples];

    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
            <h1>QPub React Integration Examples</h1>

            <div style={{ marginBottom: "20px" }}>
                <label>Choose example: </label>
                <select
                    value={activeExample}
                    onChange={(e) => setActiveExample(e.target.value)}
                >
                    <option value="basic">Basic Usage</option>
                    <option value="channel">Channel Components</option>
                    <option value="multi">Multiple Channels</option>
                    <option value="error">Error Handling</option>
                </select>
            </div>

            <div style={{ border: "1px solid #ddd", padding: "20px" }}>
                <ExampleComponent />
            </div>
        </div>
    );
}
