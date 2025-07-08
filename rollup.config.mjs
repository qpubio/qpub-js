import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";

export default {
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
        typescript({ declaration: true, declarationDir: "./build" }),
        resolve({ browser: true, preferBuiltins: false }),
        commonjs({ transformMixedEsModules: true }),
        terser(),
    ],
    external: ["ws", "crypto", "http", "https", "url"],
};
