import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": resolve(__dirname, "src"),
            "@components": resolve(__dirname, "src/components"),
            "@hooks": resolve(__dirname, "src/hooks"),
            "@game": resolve(__dirname, "src/game"),
            "@styles": resolve(__dirname, "src/styles"),
            "@utils": resolve(__dirname, "src/utils")
        }
    },
    server: {
        port: 3000,
        open: true,
        host: true
    },
    build: {
        outDir: "dist",
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
