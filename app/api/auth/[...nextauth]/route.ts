import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Only use adapter if database is available and we have proper environment
const getAdapter = () => {
  // Skip adapter during build time or when environment variables are missing
  if (!process.env.NEON_DATABASE_URL || 
      (process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV)) {
    console.warn('Database not available or build time, running without adapter');
    return undefined;
  }
  
  try {
    return DrizzleAdapter(db());
  } catch (error) {
    console.warn('Database adapter initialization failed, running without adapter:', error);
    return undefined;
  }
};

const handler = NextAuth({
  adapter: getAdapter(),
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorization: {
          params: {
            prompt: "consent",
            access_type: "offline",
            response_type: "code"
          }
        }
      })
    ] : []),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        // Add user ID to session
        session.user.id = token.sub!;
        
        // Fetch additional user data (only if database is available)
        if (process.env.NEON_DATABASE_URL) {
          try {
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
          } catch (error) {
            console.warn('Failed to fetch user data:', error);
            // Continue without user data - this allows the session to work even if DB is unavailable
          }
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
      if (account?.provider === "google" && process.env.NEON_DATABASE_URL) {
        try {
          // Check if user exists (only if database is available)
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
          console.warn("Database unavailable during sign in, allowing sign in without persistence:", error);
          // Allow sign in even if database is unavailable (for build time)
          return true;
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