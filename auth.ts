import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { normalizeRole } from "@/lib/constants/roles"
import { getCachedProfile, setCachedProfile } from "@/lib/auth-cache"
import { getSupabaseClient } from "@/lib/supabase-server"

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
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) return false;

      const email = user.email.toLowerCase();
      const cached = getCachedProfile(email);
      if (cached) {
        (user as Record<string, unknown>).profileData = cached;
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

        const profileData = {
          email: profile.email,
          role: profile.role,
          state: profile.state,
          district: profile.district,
          name: profile.staff_name || user.name,
        };

        setCachedProfile(email, profileData);
        (user as Record<string, unknown>).profileData = profileData;
        return true;
      } catch (err) {
        console.error('[auth] Database error during signIn:', err);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user?.email && (user as Record<string, unknown>).profileData) {
        const data = (user as Record<string, unknown>).profileData as Record<string, unknown>;
        const rawRole = data.role as string ?? 'ME';
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
  pages: { signIn: "/login" },
  debug: process.env.NODE_ENV === 'development',
})