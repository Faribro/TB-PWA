import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { createClient } from "@supabase/supabase-js"
import { normalizeRole } from "@/lib/constants/roles"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
      if (!user?.email) return false;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('email, is_active')
          .eq('email', user.email)
          .eq('is_active', true)
          .single();
        
        if (error || !data) {
          console.log(`Login rejected for ${user.email}: not in profiles`);
          return false;
        }
        return true;
      } catch (err) {
        console.error('SignIn callback error:', err);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user?.email) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('role, state, district, name')
            .eq('email', user.email)
            .single();

          // CRITICAL FIX: Normalize role from short code to long form for RLS compatibility
          // profiles.role stores: PM, SPM, ME, PC, admin
          // RLS policies expect: Program Manager, State Program Manager, M&E Officer, Prison Coordinator, admin
          const rawRole = data?.role ?? 'ME';
          const normalizedRole = normalizeRole(rawRole) ?? 'M&E Officer';
          
          console.log(`[JWT] Role normalization: "${rawRole}" → "${normalizedRole}"`);
          
          token.role = normalizedRole;
          token.state = data?.state ?? 'All';
          token.district = data?.district ?? 'All';
          token.staffName = data?.name ?? user.name;
        } catch (err) {
          console.error('JWT callback error:', err);
          token.role = 'M&E Officer';
          token.state = 'All';
          token.district = 'All';
          token.staffName = user.name;
        }
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