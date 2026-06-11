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
    maxAge: 28800, // 8 hours
    updateAge: 3600, // 1 hour
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) return false;

      // Check for override cookie
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
        // Impersonate specific user by email
        try {
          const supabase = getSupabaseClient();
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('email, role, state, district, staff_name')
            .eq('email', overrideData.email.toLowerCase())
            .single();

          if (error || !profile) {
            console.error('[auth] Override user not found in profiles:', overrideData.email);
            // Fall back to normal sign-in
          } else {
            profileData = {
              email: profile.email,
              role: profile.role,
              state: profile.state,
              district: profile.district,
              name: profile.staff_name || user.name,
            };
            setCachedProfile(profile.email, profileData);
            (user as any).profileData = profileData;
            return true;
          }
        } catch (err) {
          console.error('[auth] Database error during override signIn:', err);
        }
      } else if (overrideData) {
        // Override just role/state/district but still use actual user's email
        const email = user.email.toLowerCase();
        const cached = getCachedProfile(email);
        let baseData;
        
        if (cached) {
          baseData = cached;
        } else {
          try {
            const supabase = getSupabaseClient();
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('email, role, state, district, staff_name')
              .eq('email', email)
              .single();

            if (error || !profile) {
              console.error('[auth] User not found in profiles:', email);
              return false;
            }

            baseData = {
              email: profile.email,
              role: profile.role,
              state: profile.state,
              district: profile.district,
              name: profile.staff_name || user.name,
            };
            setCachedProfile(email, baseData);
          } catch (err) {
            console.error('[auth] Database error during signIn:', err);
            return false;
          }
        }

        // Apply overrides
        profileData = {
          ...baseData,
          role: overrideData.role || baseData.role,
          state: overrideData.state || baseData.state,
          district: overrideData.district || baseData.district,
        };
        (user as any).profileData = profileData;
        return true;
      }

      // Normal sign-in without override
      const email = user.email.toLowerCase();
      const cached = getCachedProfile(email);
      if (cached) {
        (user as any).profileData = cached;
        return true;
      }

      try {
        const supabase = getSupabaseClient();
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('email, role, state, district, staff_name')
          .eq('email', email)
          .single();

        if (error || !profile) {
          console.error('[auth] User not found in profiles:', email);
          return false;
        }

        profileData = {
          email: profile.email,
          role: profile.role,
          state: profile.state,
          district: profile.district,
          name: profile.staff_name || user.name,
        };

        setCachedProfile(email, profileData);
        (user as any).profileData = profileData;
        return true;
      } catch (err) {
        console.error('[auth] Database error during signIn:', err);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user?.email && (user as any).profileData) {
        const data = (user as any).profileData;
        const rawRole = data.role ?? 'ME';
        token.role = normalizeRole(rawRole) ?? 'M&E Officer';
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
    error: "/login" // Redirect to login on auth errors
  },
  debug: process.env.NODE_ENV === 'development',
  // Add error handling for session issues
  events: {
    async signOut(message) {
      console.log('[auth] User signed out');
    },
    async signIn(message) {
      console.log('[auth] User signed in:', message.user?.email);
    },
  },
})