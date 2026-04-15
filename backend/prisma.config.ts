import "dotenv/config";
import { defineConfig } from "prisma/config";

// Use PRISMA_SCHEMA env var to switch between SQLite (dev) and PostgreSQL (deploy)
const schema = process.env.PRISMA_SCHEMA || "prisma/schema.prisma";

export default defineConfig({
  schema,
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
