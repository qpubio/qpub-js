import React from "react";
import { AuthEvents } from "../../types/event.type";
import { UseAuthReturn } from "../context/types";
import { useSocketContext } from "../context/SocketContext";
import { AuthResponse, TokenRequest } from "../../interfaces/token.interface";
import { AuthManager } from "../../core/managers/auth-manager";

/**
 * Hook for managing authentication with Socket interface
 * Exposes all AuthManager methods directly
 *
 * @returns Authentication state and all SDK methods
 */
export function useAuth(): UseAuthReturn {
    const { socket } = useSocketContext();
    const authManager: AuthManager = socket.authManager;

    const [token, setToken] = React.useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);
    const [isAuthenticating, setIsAuthenticating] = React.useState(false);
    const [error, setError] = React.useState<Error | null>(null);

    React.useEffect(() => {
        if (!authManager) return;

        // Check initial authentication state
        const currentToken = authManager.getToken();
        setToken(currentToken);
        setIsAuthenticated(!!currentToken);

        // Set up authentication event listeners
        const handleTokenUpdated = (newToken: string) => {
            setToken(newToken);
            setIsAuthenticated(true);
            setIsAuthenticating(false);
            setError(null);
        };

        const handleTokenExpired = () => {
            setToken(null);
            setIsAuthenticated(false);
            setIsAuthenticating(false);
        };

        const handleTokenError = (err: Error) => {
            setError(err);
            setIsAuthenticating(false);
            setIsAuthenticated(false);
        };

        const handleAuthError = (err: Error) => {
            setError(err);
            setIsAuthenticating(false);
            setIsAuthenticated(false);
        };

        // Subscribe to auth events
        authManager.on(AuthEvents.TOKEN_UPDATED, handleTokenUpdated);
        authManager.on(AuthEvents.TOKEN_EXPIRED, handleTokenExpired);
        authManager.on(AuthEvents.TOKEN_ERROR, handleTokenError);
        authManager.on(AuthEvents.AUTH_ERROR, handleAuthError);

        // Cleanup
        return () => {
            authManager.off(AuthEvents.TOKEN_UPDATED, handleTokenUpdated);
            authManager.off(AuthEvents.TOKEN_EXPIRED, handleTokenExpired);
            authManager.off(AuthEvents.TOKEN_ERROR, handleTokenError);
            authManager.off(AuthEvents.AUTH_ERROR, handleAuthError);
        };
    }, [authManager]);

    // Core authentication methods
    const authenticate =
        React.useCallback(async (): Promise<AuthResponse | null> => {
            if (!authManager || isAuthenticating) return null;

            setIsAuthenticating(true);
            setError(null);

            try {
                const response = await authManager.authenticate();
                return response;
            } catch (err) {
                setError(err as Error);
                setIsAuthenticating(false);
                throw err;
            }
        }, [authManager, isAuthenticating]);

    const clearToken = React.useCallback(() => {
        if (!authManager) return;
        authManager.clearToken();
    }, [authManager]);

    const shouldAutoAuthenticate = React.useCallback(() => {
        if (!authManager) return false;
        return authManager.shouldAutoAuthenticate();
    }, [authManager]);

    // URL and headers for authenticated requests
    const getAuthHeaders = React.useCallback(() => {
        if (!authManager) throw new Error("AuthManager not available");
        return authManager.getAuthHeaders();
    }, [authManager]);

    const getAuthQueryParams = React.useCallback(() => {
        if (!authManager) throw new Error("AuthManager not available");
        return authManager.getAuthQueryParams();
    }, [authManager]);

    const getAuthenticateUrl = React.useCallback(
        (baseUrl: string) => {
            if (!authManager) throw new Error("AuthManager not available");
            return authManager.getAuthenticateUrl(baseUrl);
        },
        [authManager]
    );

    const requestToken = React.useCallback(
        async (request: TokenRequest): Promise<AuthResponse> => {
            if (!authManager) throw new Error("AuthManager not available");
            return authManager.requestToken(request);
        },
        [authManager]
    );

    return {
        // State
        token,
        isAuthenticated,
        isAuthenticating,
        error,

        // Core authentication methods
        authenticate,
        clearToken,
        shouldAutoAuthenticate,
        getAuthHeaders,
        getAuthQueryParams,
        getAuthenticateUrl,
        requestToken,
    };
}
