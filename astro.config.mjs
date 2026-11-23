import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
// https://astro.build/config
export default defineConfig({
    output: "static",
    root: "./web",
    srcDir: "./web/src",
    outDir: "./web/dist",
    publicDir: "./web/public",

    vite: {
        plugins: [tailwindcss()],
        server: {
            proxy: {
                "/api": {
                    target: "http://localhost:3000",
                    changeOrigin: true,
                },
            },
        },
    },
});
