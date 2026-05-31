import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { sql } from "@/lib/d1";
import { initDb } from "@/lib/db";
import { addBrevoContact } from "@/lib/email";

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

        const rows = await sql<{
          id: number;
          email: string;
          name: string;
          password_hash: string | null;
          tier: string;
        }>`
          SELECT id, email, name, password_hash, tier FROM users WHERE email = ${credentials.email as string}
        `;

        if (rows.length === 0) return null;

        const user = rows[0];
        if (!user.password_hash) return null;
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
        // Ensure schema exists (idempotent, SQLite-valid)
        await initDb();

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
        const rows = await sql<{
          id: number;
          tier: string;
          amnesty: number;
          stripe_customer_id: string | null;
        }>`SELECT id, tier, amnesty, stripe_customer_id FROM users WHERE email = ${token.email}`;
        if (rows.length > 0) {
          token.userId = rows[0].id;
          token.tier = rows[0].tier;
          token.amnesty = !!rows[0].amnesty;
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
        user.amnesty = token.amnesty;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
});
