import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      studentType?: string | null;
      courseInterest?: string | null;
      experienceLevel?: string | null;
      analyticsConsent?: boolean | null;
      privacyConsent?: boolean | null;
    } & DefaultSession["user"];
  }
  
  interface User {
    studentType?: string | null;
    courseInterest?: string | null;
    experienceLevel?: string | null;
    analyticsConsent?: boolean | null;
    privacyConsent?: boolean | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    studentType?: string | null;
    courseInterest?: string | null;
    experienceLevel?: string | null;
    analyticsConsent?: boolean | null;
    privacyConsent?: boolean | null;
  }
}