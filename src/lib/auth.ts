import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
  events: {
    async signIn({ account }) {
      if (account?.access_token) {
        const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
        fetch(`${baseUrl}/api/sync`, {
          method: "POST",
          headers: {
            "x-internal-token": account.access_token,
          },
        }).catch(() => {
          // Non-fatal — user can manually sync
        });
      }
    },
  },
});
