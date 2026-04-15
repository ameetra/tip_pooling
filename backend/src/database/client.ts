import 'dotenv/config';
import type { PrismaClient as SqlitePrismaClient } from '../generated/prisma/client';

const isPostgres = (process.env.DATABASE_URL || '').startsWith('postgresql://');

function createClient(): SqlitePrismaClient {
  if (isPostgres) {
    const { PrismaPg } = require('@prisma/adapter-pg');
    const { Pool } = require('pg');
    const { PrismaClient } = require('../generated/prisma-pg/client');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, ssl: { rejectUnauthorized: false } });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
  const { PrismaClient } = require('../generated/prisma/client');

  const dbPath = (process.env.DATABASE_URL || 'file:./dev.db').replace('file:', '');
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  return new PrismaClient({ adapter });
}

const prisma = createClient();
export default prisma;
