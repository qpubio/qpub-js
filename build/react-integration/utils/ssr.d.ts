import React from "react";
export declare const isClient: boolean;
export declare const isServer: boolean;
export declare const safeLocalStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
};
export declare function useIsHydrated(): boolean;
export declare function useIsMounted(): boolean;
export declare function useHydratedState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>];
//# sourceMappingURL=ssr.d.ts.map