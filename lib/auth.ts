import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET || "wave-anime-auth-secret-key-production-neon-2026",
    baseURL: process.env.BETTER_AUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    emailAndPassword: {
        enabled: true,
    },
    rateLimit: {
        window: 60,
        max: 100,
    },
});
