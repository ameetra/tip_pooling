import 'dotenv/config';
import { createApp } from './app';
import prisma from './database/client';

const PORT = process.env.PORT || 3000;
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

async function shutdown() {
  console.log('\nShutting down...');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
