import { defineConfig } from "drizzle-kit";

// Credential-free config for OFFLINE drizzle-kit commands (check, generate).
// It deliberately has no dbCredentials and does not load .env.local, so it can
// never connect to a database or contain a connection string.
// Do NOT use it for push / migrate / pull / studio: those need a connection.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
