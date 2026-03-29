import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

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
    maxAge: 28800,    // 8 hours
    updateAge: 3600,  // refresh token every 1 hour of activity
  },
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) return false;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('email, is_active')
        .eq('email', user.email)
        .eq('is_active', true)
        .single();
      
      if (error || !data) {
        console.log(`Login rejected for ${user.email}: not in profiles`);
        return '/login?error=AccessDenied';
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        // Look up user role/state from Supabase users table
        const { data } = await supabase
          .from('profiles')
          .select('role, state, district')
          .eq('email', user.email)
          .single()

        token.role = data?.role ?? 'M&E'
        token.state = data?.state ?? 'All'
        token.district = data?.district ?? 'All'

        // System Override: Only allow if real user is PM
        if (data?.role === 'PM') {
          const cookieStore = await cookies();
          const overrideCookie = cookieStore.get('__samadhaan_override');
          
          if (overrideCookie?.value) {
            try {
              const override = JSON.parse(overrideCookie.value);
              token.role = override.role ?? data.role;
              token.state = override.state ?? data.state;
              token.district = override.district ?? data.district;
              token.isImpersonating = true;
              token.realRole = 'PM';
              
              console.log(`[OVERRIDE] PM ${user.email} impersonating as ${override.role}`);
              
              // Clear the cookie immediately
              cookieStore.delete('__samadhaan_override');
            } catch (err) {
              console.error('[OVERRIDE] Failed to parse override cookie:', err);
            }
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.state = token.state as string
        session.user.district = token.district as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})