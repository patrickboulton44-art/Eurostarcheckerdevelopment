import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { neon } from "@neondatabase/serverless";
import { addBrevoContact } from "@/lib/email";

function getDb() {
  const url = process.env.DATABASE_URL || process.env.STORAGE_URL;
  if (!url) throw new Error("DATABASE_URL or STORAGE_URL is not set");
  return neon(url);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const sql = getDb();
        const rows = await sql`
          SELECT id, email, name, password_hash, tier FROM users WHERE email = ${credentials.email as string}
        `;

        if (rows.length === 0) return null;

        const user = rows[0];
        const bcrypt = await import("bcryptjs");
        const valid = await bcrypt.compare(credentials.password as string, user.password_hash);
        if (!valid) return null;

        return { id: String(user.id), email: user.email, name: user.name };
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      try {
        const sql = getDb();

        // Ensure users table exists
        await sql`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL DEFAULT '',
            password_hash TEXT,
            google_id TEXT,
            tier TEXT NOT NULL DEFAULT 'free',
            stripe_customer_id TEXT,
            stripe_subscription_id TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `;

        if (account?.provider === "google") {
          await sql`
            INSERT INTO users (email, name, google_id, tier)
            VALUES (${user.email}, ${user.name || ""}, ${account.providerAccountId}, 'free')
            ON CONFLICT (email) DO UPDATE SET
              name = COALESCE(NULLIF(${user.name || ""}, ''), users.name),
              google_id = ${account.providerAccountId}
          `;

          // Add to Brevo CRM
          await addBrevoContact(user.email, user.name || "", "free");
        }

        return true;
      } catch (error) {
        console.error("[auth] signIn error:", error);
        return false;
      }
    },
    async jwt({ token }) {
      if (token.email) {
        const sql = getDb();
        const rows = await sql`SELECT id, tier, stripe_customer_id FROM users WHERE email = ${token.email}`;
        if (rows.length > 0) {
          token.userId = rows[0].id;
          token.tier = rows[0].tier;
          token.stripeCustomerId = rows[0].stripe_customer_id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = session.user as any;
        user.id = token.userId;
        user.tier = token.tier;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
});
