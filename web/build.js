import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "dist");
const srcDir = path.resolve(__dirname, "src");

if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

const oldAssets = path.resolve(distDir, "assets");
if (fs.existsSync(oldAssets)) {
    fs.rmSync(oldAssets, { recursive: true, force: true });
}

console.log("[BUILD] Compiling Tailwind CSS...");
execSync("npx @tailwindcss/cli -i ./src/input.css -o ./dist/output.css --minify", {
    cwd: __dirname,
    stdio: "inherit",
});

fs.copyFileSync(path.resolve(srcDir, "index.html"), path.resolve(distDir, "index.html"));
fs.copyFileSync(path.resolve(srcDir, "app.js"), path.resolve(distDir, "app.js"));

console.log("[BUILD] Web assets built successfully in web/dist.");
