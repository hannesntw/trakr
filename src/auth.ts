import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens, verifiedDomains, organizationMembers } from "@/db/schema";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Nodemailer({
      server: process.env.EMAIL_SERVER,
      from: process.env.AUTH_EMAIL_FROM ?? "Stori <hey@stori.zone>",
    }),
  ],
  events: {
    async createUser({ user }) {
      // Auto-capture: if the new user's email domain matches a verified domain
      // with autoCapture enabled, add them to that org automatically.
      const domain = user.email?.split("@")[1]?.toLowerCase();
      if (!domain) return;

      const matches = await db
        .select({ orgId: verifiedDomains.orgId })
        .from(verifiedDomains)
        .where(and(
          eq(verifiedDomains.domain, domain),
          eq(verifiedDomains.status, "verified"),
          eq(verifiedDomains.autoCapture, true),
        ));

      for (const { orgId } of matches) {
        await db
          .insert(organizationMembers)
          .values({ orgId, userId: user.id!, role: "member" })
          .onConflictDoNothing();
      }
    },
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Org membership is resolved per-request in API routes via org-auth.ts,
        // not stuffed into the session. This keeps the session lean.
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
  },
});
