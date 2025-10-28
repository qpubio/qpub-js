import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";

// Main QPub package config
const mainConfig = {
    input: "src/qpub.ts",
    output: [
        {
            file: "build/qpub.cjs.js",
            format: "cjs",
            exports: "auto",
            sourcemap: true,
        },
        {
            file: "build/qpub.esm.js",
            format: "esm",
            sourcemap: true,
        },
        {
            file: "build/qpub.umd.js",
            format: "umd",
            name: "QPub",
            exports: "named",
            globals: {
                ws: "WebSocket",
            },
            sourcemap: true,
        },
    ],
    plugins: [
        typescript({
            declaration: true,
            declarationDir: "./build",
            exclude: ["src/react-integration/**/*"],
        }),
        resolve({ browser: true, preferBuiltins: false }),
        commonjs({ transformMixedEsModules: true }),
        terser(),
    ],
    external: ["ws", "crypto", "http", "https", "url"],
};

// React package config
const reactConfig = {
    input: "src/react-integration/index.ts",
    output: [
        {
            file: "build/qpub-react.cjs.js",
            format: "cjs",
            exports: "auto",
            sourcemap: true,
        },
        {
            file: "build/qpub-react.esm.js",
            format: "esm",
            sourcemap: true,
        },
    ],
    plugins: [
        typescript({
            declaration: true,
            declarationDir: "./build",
            declarationMap: true,
            include: [
                "src/react-integration/**/*",
                "src/core/**/*",
                "src/interfaces/**/*",
                "src/types/**/*",
                "src/utils/**/*",
            ],
            jsx: "react-jsx",
        }),
        resolve({ browser: true, preferBuiltins: false }),
        commonjs({ transformMixedEsModules: true }),
        terser(),
    ],
    external: [
        "react",
        "react/jsx-runtime",
        "ws",
        "crypto",
        "http",
        "https",
        "url",
    ],
};

export default [mainConfig, reactConfig];
