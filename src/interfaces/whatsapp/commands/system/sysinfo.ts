import os from "os";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { Command, CommandContext } from "../../types.js";
import { prisma } from "../../../../core/db.js";

function formatDuration(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(" ");
}

async function getCpuUsage(): Promise<number> {
    const startCpus = os.cpus();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const endCpus = os.cpus();

    let idleDiff = 0;
    let totalDiff = 0;

    for (let i = 0; i < startCpus.length; i++) {
        const startTimes = startCpus[i].times;
        const endTimes = endCpus[i].times;

        const startTotal = Object.values(startTimes).reduce((a, b) => a + b, 0);
        const endTotal = Object.values(endTimes).reduce((a, b) => a + b, 0);

        idleDiff += endTimes.idle - startTimes.idle;
        totalDiff += endTotal - startTotal;
    }

    if (totalDiff <= 0) return 0;
    const usage = ((totalDiff - idleDiff) / totalDiff) * 100;
    return Math.max(0, Math.min(100, Math.round(usage)));
}

function getStorageUsage(): { usedGB: string; totalGB: string; percent: number } | null {
    try {
        const stat = fs.statfsSync(process.cwd());
        const totalBytes = stat.blocks * stat.bsize;
        const freeBytes = stat.bavail * stat.bsize;
        const usedBytes = totalBytes - freeBytes;
        if (totalBytes <= 0) return null;
        return {
            usedGB: (usedBytes / 1024 ** 3).toFixed(1),
            totalGB: (totalBytes / 1024 ** 3).toFixed(1),
            percent: Math.round((usedBytes / totalBytes) * 100),
        };
    } catch {
        return null;
    }
}

function getLatestCommit(): string {
    // 1. Try git log with short hash and commit message
    try {
        const out = execSync('git log -1 --format="%h (%s)"', {
            cwd: process.cwd(),
            encoding: "utf-8",
            timeout: 1000,
            stdio: ["pipe", "pipe", "ignore"],
        }).trim();
        if (out) return out;
    } catch {
        // Fallback to simpler git command
    }

    // 2. Try git rev-parse --short HEAD
    try {
        const out = execSync("git rev-parse --short HEAD", {
            cwd: process.cwd(),
            encoding: "utf-8",
            timeout: 1000,
            stdio: ["pipe", "pipe", "ignore"],
        }).trim();
        if (out) return out;
    } catch {
        // Fallback to reading .git directly
    }

    // 3. Fallback: Read .git files directly
    try {
        const gitHeadPath = path.resolve(process.cwd(), ".git", "HEAD");
        if (fs.existsSync(gitHeadPath)) {
            const headContent = fs.readFileSync(gitHeadPath, "utf-8").trim();
            if (headContent.startsWith("ref: ")) {
                const refPath = path.resolve(process.cwd(), ".git", headContent.slice(5).trim());
                if (fs.existsSync(refPath)) {
                    return fs.readFileSync(refPath, "utf-8").trim().slice(0, 7);
                }
            } else if (headContent.length >= 7) {
                return headContent.slice(0, 7);
            }
        }
    } catch {
        // Fallback to environment variable
    }

    return process.env.GIT_COMMIT || "Unknown";
}

async function checkDatabase(): Promise<{ ok: boolean; latency: number; error?: string }> {
    try {
        const t0 = performance.now();
        await prisma.$queryRawUnsafe("SELECT 1");
        const latency = Math.round(performance.now() - t0);
        return { ok: true, latency };
    } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return { ok: false, latency: 0, error: errorMsg };
    }
}

export const command: Command = {
    name: "sysinfo",
    aliases: ["stats", "status", "system"],
    category: "system",
    description: "Cek status bot, uptime, resource, database, dan web dashboard",
    execute: async (ctx: CommandContext) => {
        const [cpuUsage, db] = await Promise.all([getCpuUsage(), checkDatabase()]);

        // CPU & Cores
        const cpus = os.cpus();
        const cpuCores = cpus.length;

        // RAM calculations
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const totalRamGB = (totalMem / 1024 ** 3).toFixed(2);
        const usedRamGB = (usedMem / 1024 ** 3).toFixed(2);
        const ramPercent = Math.round((usedMem / totalMem) * 100);
        const botRssMB = Math.round(process.memoryUsage().rss / 1024 / 1024);

        // Storage calculation
        const storage = getStorageUsage();
        const storageStr = storage ? `${storage.usedGB} GB / ${storage.totalGB} GB (${storage.percent}%)` : null;

        // Port & Web config
        const webPort = process.env.PORT || "3000";
        const webHost = process.env.HOST || "0.0.0.0";

        // Commit hash
        const commit = getLatestCommit();

        // Load average (relevant on Linux systems)
        const loadAvg = os.loadavg();
        const hasLoadAvg = loadAvg.some((val) => val > 0);
        const loadAvgStr = hasLoadAvg ? loadAvg.map((val) => val.toFixed(2)).join(", ") : null;

        const lines: (string | null)[] = [
            `📊 *STATUS SISTEM & BOT*`,
            ``,
            `⏱️ *Uptime:*`,
            `- Bot: ${formatDuration(process.uptime())}`,
            `- Sistem: ${formatDuration(os.uptime())}`,
            ``,
            `⚡ *Resource Usage:*`,
            `- CPU: ${cpuUsage}% (${cpuCores} Cores)`,
            loadAvgStr ? `- Load Avg: ${loadAvgStr}` : null,
            `- RAM Sistem: ${usedRamGB} GB / ${totalRamGB} GB (${ramPercent}%)`,
            `- RAM Bot (RSS): ${botRssMB} MB`,
            storageStr ? `- Storage: ${storageStr}` : `- Storage: N/A`,
            ``,
            `🗄️ *Database (SQLite):*`,
            db.ok ? `- Status: Connected (${db.latency}ms)` : `- Status: Disconnected (${db.error})`,
            ``,
            `🌐 *Web Dashboard:*`,
            `- Port: ${webPort}`,
            `- Bind: ${webHost}:${webPort}`,
            ``,
            `🔖 *Latest Commit:*`,
            `- \`${commit}\``,
        ];

        const response = lines.filter((line): line is string => line !== null).join("\n");
        await ctx.reply(response);
    },
};

export default command;
