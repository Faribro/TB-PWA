import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { cookies } from "next/headers"
import { normalizeRole } from "@/lib/constants/roles"
import { getCachedProfile, setCachedProfile } from "@/lib/auth-cache"
import { prisma } from "@/lib/prisma"

interface OverrideCookie {
  email?: string;
  role?: string;
  state?: string | null;
  district?: string | null;
}

// Fetch profile using local PostgreSQL via Prisma
async function fetchProfile(email: string, fallbackName?: string | null) {
  try {
    const profile = await prisma.profiles.findUnique({
      where: { email },
    });

    if (profile) {
      return {
        email: profile.email,
        role: profile.role || 'Facility',
        state: profile.state ?? null,
        district: profile.district ?? null,
        name: profile.staff_name ?? fallbackName ?? null,
      };
    }
  } catch (error) {
    console.error('[auth] fetchProfile error:', error);
  }

  return null;
}

const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  (process.env.NODE_ENV !== "production" ? "dev-placeholder-secret" : undefined);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: "credentials",
      name: "Portal Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const email = String(credentials.email).toLowerCase().trim();
        
        let profile = await fetchProfile(email);
        if (!profile) {
          // If admin or test login, auto-create profile
          const created = await prisma.profiles.upsert({
            where: { email },
            update: {},
            create: {
              email,
              role: email.includes('admin') ? 'Admin' : 'Facility',
              staff_name: email.split('@')[0],
              state: 'Maharashtra',
              district: 'Pune',
            },
          });
          profile = {
            email: created.email,
            role: created.role || 'Facility',
            state: created.state ?? null,
            district: created.district ?? null,
            name: created.staff_name ?? email.split('@')[0],
          };
        }

        return {
          id: email,
          email: profile.email,
          name: profile.name || email.split('@')[0],
          profileData: profile,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 28800,
    updateAge: 3600,
  },
  secret: AUTH_SECRET,
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) return false;
      if ((user as any).profileData) return true;

      const cookieStore = await cookies();
      const overrideCookie = cookieStore.get('__samadhaan_override');
      let overrideData: OverrideCookie | null = null;

      if (overrideCookie) {
        try {
          overrideData = JSON.parse(overrideCookie.value) as OverrideCookie;
        } catch (e) {
          console.error('[auth] Failed to parse override cookie:', e);
        }
      }

      let profileData;

      if (overrideData?.email) {
        const profile = await fetchProfile(overrideData.email.toLowerCase(), user.name);
        if (profile) {
          setCachedProfile(profile.email, profile);
          (user as any).profileData = profile;
          return true;
        }
      } else if (overrideData) {
        const email = user.email.toLowerCase();
        let baseData = getCachedProfile(email) as any;
        if (!baseData) {
          baseData = await fetchProfile(email, user.name);
          if (!baseData) return false;
          setCachedProfile(email, baseData);
        }
        profileData = {
          ...baseData,
          role: overrideData.role || baseData.role,
          state: overrideData.state ?? baseData.state,
          district: overrideData.district ?? baseData.district,
        };
        (user as any).profileData = profileData;
        return true;
      }

      // Normal sign-in
      const email = user.email.toLowerCase();
      const cached = getCachedProfile(email);
      if (cached) {
        (user as any).profileData = cached;
        return true;
      }

      const profile = await fetchProfile(email, user.name);
      if (!profile) {
        console.error('[auth] User not found in profiles:', email);
        return false;
      }

      setCachedProfile(email, profile);
      (user as any).profileData = profile;
      return true;
    },

    async jwt({ token, user }) {
      if (user?.email && (user as any).profileData) {
        const data = (user as any).profileData;
        token.role = normalizeRole(data.role) ?? 'M&E Officer';
        token.state = data.state ?? 'All';
        token.district = data.district ?? 'All';
        token.staffName = data.name ?? user.name;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.state = token.state as string;
        session.user.district = token.district as string;
        session.user.staffName = token.staffName as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: process.env.NODE_ENV === 'development',
  events: {
    async signOut() { console.log('[auth] User signed out'); },
    async signIn(message) { console.log('[auth] User signed in:', message.user?.email); },
  },
})
