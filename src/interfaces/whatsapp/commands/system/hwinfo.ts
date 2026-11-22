import os from "os";
import fs from "fs";
import { Command, CommandContext } from "../../types.js";

function getOsInfo(): { name: string; kernel: string } {
    let name = os.type();
    const kernel = os.release();

    if (os.platform() === "linux") {
        try {
            if (fs.existsSync("/etc/os-release")) {
                const content = fs.readFileSync("/etc/os-release", "utf-8");
                const match = content.match(/^PRETTY_NAME=["']?([^"'\n]+)["']?/m);
                if (match && match[1]) {
                    name = match[1];
                }
            }
        } catch {
            name = `Linux (${kernel})`;
        }
    } else if (os.platform() === "win32") {
        name = os.version() || `Windows (${kernel})`;
    } else if (os.platform() === "darwin") {
        name = `macOS (${kernel})`;
    }

    return { name, kernel };
}

function getMachineModel(): string | null {
    if (os.platform() === "linux") {
        try {
            const vendorPath = "/sys/class/dmi/id/sys_vendor";
            const productPath = "/sys/class/dmi/id/product_name";

            const vendor = fs.existsSync(vendorPath) ? fs.readFileSync(vendorPath, "utf-8").trim() : "";
            const product = fs.existsSync(productPath) ? fs.readFileSync(productPath, "utf-8").trim() : "";

            const combined = `${vendor} ${product}`.trim();
            if (combined && !combined.includes("To be filled") && !combined.includes("Default string")) {
                return combined;
            }
        } catch {
            return null;
        }
    }
    return null;
}

function getStorageDetails(): { totalGB: string; usedGB: string; freeGB: string; percent: number } | null {
    try {
        const stat = fs.statfsSync(process.cwd());
        const totalBytes = stat.blocks * stat.bsize;
        const freeBytes = stat.bavail * stat.bsize;
        const usedBytes = totalBytes - freeBytes;

        if (totalBytes <= 0) return null;

        return {
            totalGB: (totalBytes / 1024 ** 3).toFixed(1),
            usedGB: (usedBytes / 1024 ** 3).toFixed(1),
            freeGB: (freeBytes / 1024 ** 3).toFixed(1),
            percent: Math.round((usedBytes / totalBytes) * 100),
        };
    } catch {
        return null;
    }
}

function getNetworkAddresses(): { name: string; ip: string }[] {
    const interfaces = os.networkInterfaces();
    const result: { name: string; ip: string }[] = [];

    for (const [name, nets] of Object.entries(interfaces)) {
        if (!nets) continue;
        for (const net of nets) {
            if (!net.internal && net.family === "IPv4") {
                result.push({ name, ip: net.address });
            }
        }
    }

    return result;
}

export const command: Command = {
    name: "hwinfo",
    aliases: ["hardware", "neofetch", "spec", "specs", "serverinfo"],
    category: "system",
    description: "Tampilkan spesifikasi lengkap hardware host dan server",
    execute: async (ctx: CommandContext) => {
        // OS & Host
        const hostname = os.hostname();
        const { name: osName, kernel } = getOsInfo();
        const machineModel = getMachineModel();
        const arch = os.arch();
        const endianness = os.endianness() === "LE" ? "Little Endian" : "Big Endian";

        // CPU
        const cpus = os.cpus();
        const cpuModel = cpus[0]?.model?.trim() || "Unknown CPU";
        const cpuCount = cpus.length;
        const cpuSpeed = cpus[0]?.speed
            ? cpus[0].speed >= 1000
                ? `${(cpus[0].speed / 1000).toFixed(2)} GHz`
                : `${cpus[0].speed} MHz`
            : "N/A";

        // Memory
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const totalRamGB = (totalMem / 1024 ** 3).toFixed(2);
        const usedRamGB = (usedMem / 1024 ** 3).toFixed(2);
        const freeRamGB = (freeMem / 1024 ** 3).toFixed(2);
        const ramPercent = Math.round((usedMem / totalMem) * 100);

        // Storage
        const storage = getStorageDetails();

        // Network
        const networks = getNetworkAddresses();

        // Node process
        const nodeVersion = process.version;

        const lines: (string | null)[] = [
            `🖥️ *INFORMASI HARDWARE & SPESIFIKASI HOST*`,
            ``,
            `💻 *Host & Sistem Operasi:*`,
            `- Hostname: ${hostname}`,
            machineModel ? `- Model: ${machineModel}` : null,
            `- OS: ${osName}`,
            `- Kernel: ${kernel}`,
            `- Arsitektur: ${arch} (${endianness})`,
            ``,
            `🧠 *Processor (CPU):*`,
            `- Model: ${cpuModel}`,
            `- Core/Threads: ${cpuCount} Cores`,
            `- Base Speed: ~${cpuSpeed}`,
            ``,
            `💾 *Memory (RAM):*`,
            `- Total Fisik: ${totalRamGB} GB`,
            `- Terpakai: ${usedRamGB} GB (${ramPercent}%)`,
            `- Bebas: ${freeRamGB} GB`,
            ``,
            `💽 *Penyimpanan (Storage):*`,
            storage
                ? `- Kapasitas: ${storage.totalGB} GB\n- Terpakai: ${storage.usedGB} GB (${storage.percent}%)\n- Tersedia: ${storage.freeGB} GB`
                : `- Status: Tidak dapat membaca disk`,
            ``,
            `🌐 *Jaringan Aktif (IPv4):*`,
            networks.length > 0
                ? networks.map((net) => `- ${net.name}: ${net.ip}`).join("\n")
                : `- Tidak ada antarmuka publik/LAN terdeteksi`,
            ``,
            `⚙️ *Runtime Environment:*`,
            `- Node.js: ${nodeVersion}`,
            `- Platform: ${process.platform}`,
        ];

        const response = lines.filter((line): line is string => line !== null).join("\n");
        await ctx.reply(response);
    },
};

export default command;
