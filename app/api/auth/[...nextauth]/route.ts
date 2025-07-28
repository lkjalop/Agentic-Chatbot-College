import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const handler = NextAuth({
  adapter: DrizzleAdapter(db()),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        // Add user ID to session
        session.user.id = token.sub!;
        
        // Fetch additional user data
        const userData = await db().query.users.findFirst({
          where: eq(users.id, token.sub!)
        });
        
        if (userData) {
          session.user.studentType = userData.studentType;
          session.user.courseInterest = userData.courseInterest;
          session.user.experienceLevel = userData.experienceLevel;
          session.user.analyticsConsent = userData.analyticsConsent;
          session.user.privacyConsent = userData.privacyConsent;
        }
      }
      return session;
    },
    async jwt({ token, user, account, profile, trigger, session }) {
      if (trigger === "update" && session) {
        // Handle session updates
        return { ...token, ...session.user };
      }
      
      if (user) {
        token.id = user.id;
      }
      
      return token;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Check if user exists
          const existingUser = await db().query.users.findFirst({
            where: eq(users.email, user.email!)
          });
          
          if (!existingUser) {
            // Create new user with default values
            await db().insert(users).values({
              email: user.email!,
              name: user.name || "Unknown User",
              googleId: account.providerAccountId,
              picture: user.image,
              privacyConsent: true, // Implied by OAuth
              analyticsConsent: true,
              lastLogin: new Date(),
              loginCount: 1
            });
          } else {
            // Update last login
            await db().update(users)
              .set({ 
                lastLogin: new Date(),
                loginCount: (existingUser.loginCount || 0) + 1,
                googleId: account.providerAccountId,
                picture: user.image
              })
              .where(eq(users.id, existingUser.id));
          }
          
          return true;
        } catch (error) {
          console.error("Error during sign in:", error);
          return false;
        }
      }
      
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };