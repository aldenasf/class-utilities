import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "dist");
const srcDir = path.resolve(__dirname, "src");

if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

function copyFiles() {
    fs.copyFileSync(path.resolve(srcDir, "index.html"), path.resolve(distDir, "index.html"));
    fs.copyFileSync(path.resolve(srcDir, "app.js"), path.resolve(distDir, "app.js"));
}

copyFiles();
console.log("[DEV] Watching Tailwind CSS and source files...");

fs.watch(srcDir, (eventType, filename) => {
    if (filename === "index.html" || filename === "app.js") {
        copyFiles();
        console.log(`[DEV] Updated ${filename} -> dist/`);
    }
});

const tw = spawn("npx", ["@tailwindcss/cli", "-i", "./src/input.css", "-o", "./dist/output.css", "--watch"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: true,
});

process.on("SIGINT", () => {
    tw.kill();
    process.exit(0);
});
