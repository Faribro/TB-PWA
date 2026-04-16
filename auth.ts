import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { createClient } from "@supabase/supabase-js"
import { normalizeRole } from "@/lib/constants/roles"
import { getCachedProfile, setCachedProfile } from "@/lib/auth-cache"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: { schema: 'public' },
    global: { fetch: fetch },
    auth: { persistSession: false, autoRefreshToken: false }
  }
)

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
      console.log('[auth] signIn callback triggered for:', user?.email);
      
      if (!user?.email) {
        console.error('[auth] ❌ No email provided');
        return false;
      }
      
      // Check if user exists in profiles table
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', user.email.toLowerCase())
          .single();
        
        if (error || !profile) {
          console.error('[auth] ❌ User not found in profiles:', user.email);
          return false;
        }
        
        console.log('[auth] ✅ User found in profiles:', user.email, 'Role:', profile.role);
        
        // Store profile data for JWT callback
        (user as any).profileData = {
          email: profile.email,
          role: profile.role,
          state: profile.state,
          district: profile.district,
          name: profile.staff_name || user.name,
          is_active: true
        };
        
        return true;
      } catch (err) {
        console.error('[auth] ❌ Database error:', err);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user?.email && (user as any).profileData) {
        const data = (user as any).profileData;
        const rawRole = data.role ?? 'ME';
        const normalizedRole = normalizeRole(rawRole) ?? 'M&E Officer';
        
        token.role = normalizedRole;
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
  },
  debug: process.env.NODE_ENV === 'development',
})