import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

export default {
  out: './drizzle',
  schema: './lib/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
};
