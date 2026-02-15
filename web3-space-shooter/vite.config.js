import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
    root: "frontend",
    plugins: [react()],
    resolve: {
        alias: {
            "@": resolve(__dirname, "frontend/src"),
            "@components": resolve(__dirname, "frontend/src/components"),
            "@hooks": resolve(__dirname, "frontend/src/hooks"),
            "@game": resolve(__dirname, "frontend/src/game"),
            "@styles": resolve(__dirname, "frontend/src/styles"),
            "@utils": resolve(__dirname, "frontend/src/utils")
        }
    },
    server: {
        port: 3000,
        open: false,
        host: true
    },
    build: {
        outDir: "../dist",
        emptyOutDir: true,
        sourcemap: true,
        minify: "terser",
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true
            }
        },
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ["react", "react-dom"],
                    ethers: ["ethers"]
                }
            }
        }
    },
    define: {
        "process.env": {},
        __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
    }
});
