import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load the same .env.local file Next.js uses, so drizzle-kit sees the
// same DATABASE_URL as the running app.
config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local (locally) or to your " +
      "hosting provider's environment variables (production) before " +
      "running drizzle-kit."
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
