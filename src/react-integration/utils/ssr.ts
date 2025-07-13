import React from "react";

// SSR-safe utilities
export const isClient = typeof window !== "undefined";
export const isServer = !isClient;

// SSR-safe localStorage wrapper
export const safeLocalStorage = {
    getItem: (key: string): string | null => {
        if (isServer) return null;
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    },
    setItem: (key: string, value: string): void => {
        if (isServer) return;
        try {
            localStorage.setItem(key, value);
        } catch {
            // Silently fail
        }
    },
    removeItem: (key: string): void => {
        if (isServer) return;
        try {
            localStorage.removeItem(key);
        } catch {
            // Silently fail
        }
    },
};

// Hook for detecting hydration
export function useIsHydrated(): boolean {
    const [isHydrated, setIsHydrated] = React.useState(false);

    React.useEffect(() => {
        setIsHydrated(true);
    }, []);

    return isHydrated;
}

// SSR-safe state hook with localStorage persistence
export function useHydratedState<T>(
    key: string,
    initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [state, setState] = React.useState<T>(() => {
        if (isServer) return initialValue;

        const saved = safeLocalStorage.getItem(key);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                return initialValue;
            }
        }
        return initialValue;
    });

    React.useEffect(() => {
        if (state !== initialValue) {
            safeLocalStorage.setItem(key, JSON.stringify(state));
        }
    }, [key, state, initialValue]);

    return [state, setState];
}
