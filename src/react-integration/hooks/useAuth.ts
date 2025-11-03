import React from "react";
import { AuthEvents } from "../../types/events/constants";
import { UseAuthReturn } from "../context/types";
import { useSocketContext } from "../context/SocketContext";
import { AuthResponse, TokenRequest } from "../../types/config/auth";
import { IAuthManager } from "../../types/services/managers";

/**
 * Hook for managing authentication with Socket interface
 * Exposes all AuthManager methods directly
 *
 * @returns Authentication state and all SDK methods
 */
export function useAuth(): UseAuthReturn {
    const { socket } = useSocketContext();
    const auth: IAuthManager = socket.auth;

    const [token, setToken] = React.useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);
    const [isAuthenticating, setIsAuthenticating] = React.useState(false);
    const [error, setError] = React.useState<Error | null>(null);

    React.useEffect(() => {
        if (!auth) return;

        // Check initial authentication state
        const currentToken = auth.getToken();
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
        auth.on(AuthEvents.TOKEN_UPDATED, handleTokenUpdated);
        auth.on(AuthEvents.TOKEN_EXPIRED, handleTokenExpired);
        auth.on(AuthEvents.TOKEN_ERROR, handleTokenError);
        auth.on(AuthEvents.AUTH_ERROR, handleAuthError);

        // Cleanup
        return () => {
            auth.off(AuthEvents.TOKEN_UPDATED, handleTokenUpdated);
            auth.off(AuthEvents.TOKEN_EXPIRED, handleTokenExpired);
            auth.off(AuthEvents.TOKEN_ERROR, handleTokenError);
            auth.off(AuthEvents.AUTH_ERROR, handleAuthError);
        };
    }, [auth]);

    // Core authentication methods
    const authenticate =
        React.useCallback(async (): Promise<AuthResponse | null> => {
            if (!auth || isAuthenticating) return null;

            setIsAuthenticating(true);
            setError(null);

            try {
                const response = await auth.authenticate();
                return response;
            } catch (err) {
                setError(err as Error);
                setIsAuthenticating(false);
                throw err;
            }
        }, [auth, isAuthenticating]);

    const clearToken = React.useCallback(() => {
        if (!auth) return;
        auth.clearToken();
    }, [auth]);

    const shouldAutoAuthenticate = React.useCallback(() => {
        if (!auth) return false;
        return auth.shouldAutoAuthenticate();
    }, [auth]);

    // URL and headers for authenticated requests
    const getAuthHeaders = React.useCallback(() => {
        if (!auth) throw new Error("AuthManager not available");
        return auth.getAuthHeaders();
    }, [auth]);

    const getAuthQueryParams = React.useCallback(() => {
        if (!auth) throw new Error("AuthManager not available");
        return auth.getAuthQueryParams();
    }, [auth]);

    const getAuthenticateUrl = React.useCallback(
        (baseUrl: string) => {
            if (!auth) throw new Error("AuthManager not available");
            return auth.getAuthenticateUrl(baseUrl);
        },
        [auth]
    );

    const requestToken = React.useCallback(
        async (request: TokenRequest): Promise<AuthResponse> => {
            if (!auth) throw new Error("AuthManager not available");
            return auth.requestToken(request);
        },
        [auth]
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
