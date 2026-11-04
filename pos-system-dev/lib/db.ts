import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"

config({ path: ".env" }) // or .env.local

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

const sql = neon(process.env.DATABASE_URL)
export const db = drizzle(sql)

// For legacy compatibility - migrate to use db instead
export { sql }