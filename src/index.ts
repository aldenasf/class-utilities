import 'dotenv/config';
import { prisma } from './core/db.js';

async function main() {
  console.log('Utility Kelas initializing...');
  await prisma.$connect();
  console.log('Database connected successfully.');
}

main().catch(console.error);
