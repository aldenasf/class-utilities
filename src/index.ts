import 'dotenv/config';
import { prisma } from './core/db.js';
import { createServer } from './interfaces/api/server.js';
import { SchedulerEngine } from './scheduler/index.js';
import { WhatsAppBot } from './interfaces/whatsapp/client.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  console.log(`\n======================================================`);
  console.log(`🚀 Starting Utility Kelas Application`);
  console.log(`======================================================\n`);

  // 1. Connect Database
  await prisma.$connect();
  console.log(`🗄️ Database connected (SQLite).`);

  // 2. Initialize Scheduler
  await SchedulerEngine.init();

  // 3. Start Fastify Web Server & Dashboard
  const server = await createServer();
  await server.listen({ port: PORT, host: HOST });
  console.log(`🌐 Web Dashboard & API running at: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);

  // 4. Start WhatsApp Bot
  // Can be conditionally toggled if DISABLE_WA is set
  if (process.env.DISABLE_WA !== 'true') {
    console.log(`🤖 Initializing WhatsApp Bot Client...`);
    await WhatsAppBot.start();
  } else {
    console.log(`ℹ️ WhatsApp bot disabled via DISABLE_WA environment variable.`);
  }

  console.log(`\n🎉 Utility Kelas is online and ready!\n`);
}

bootstrap().catch(err => {
  console.error(`💥 Fatal error during startup:`, err);
  process.exit(1);
});
