import "dotenv/config";
import { prisma } from "./core/db.js";
import { createServer } from "./interfaces/api/server.js";
import { SchedulerEngine } from "./scheduler/index.js";
import { WhatsAppBot } from "./interfaces/whatsapp/client.js";

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";

async function bootstrap() {
    console.log("Starting Utility Kelas Application");

    // 1. Connect Database
    await prisma.$connect();
    console.log("[DB] Database connected (SQLite)");

    // 2. Initialize Scheduler
    await SchedulerEngine.init();

    // 3. Start Fastify Web Server & Dashboard
    const server = await createServer();
    await server.listen({ port: PORT, host: HOST });
    console.log(`[WEB] Dashboard & API listening on http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);

    // 4. Start WhatsApp Bot
    if (process.env.DISABLE_WA !== "true") {
        console.log("[WA] Initializing bot client...");
        await WhatsAppBot.start();
    } else {
        console.log("[WA] Bot disabled via DISABLE_WA environment variable");
    }

    console.log("Utility Kelas online and ready");
}

bootstrap().catch((err) => {
    console.error("[FATAL] Error during startup:", err);
    process.exit(1);
});
