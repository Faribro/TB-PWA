import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { cookies } from "next/headers"
import { normalizeRole } from "@/lib/constants/roles"
import { getCachedProfile, setCachedProfile } from "@/lib/auth-cache"
import { getSupabaseClient } from "@/lib/supabase-server"

interface OverrideCookie {
  email?: string;
  role?: string;
  state?: string | null;
  district?: string | null;
}

// Fetch profile using actual DB columns (state / district)
async function fetchProfile(email: string, fallbackName?: string | null) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('email, role, state, district, staff_name')
    .eq('email', email)
    .single();

  console.log('[auth] fetchProfile', email, { data, error });

  if (error || !data) return null;

  return {
    email: data.email,
    role: data.role,
    state: (data as any).state ?? null,
    district: (data as any).district ?? null,
    name: (data as any).staff_name ?? fallbackName ?? null,
  };
}

// Resolve the auth secret once. A missing secret causes next-auth v5 to fail
// during the build's "Collecting page data" step with an opaque
// "Maximum call stack size exceeded" error, so fail loudly with a clear message.
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
if (!AUTH_SECRET && process.env.NODE_ENV === "production") {
  throw new Error(
    "[auth] Missing AUTH_SECRET (or NEXTAUTH_SECRET). Set it in your environment. Generate one with: openssl rand -base64 32"
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
        // fall through to normal sign-in if override email not found
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
