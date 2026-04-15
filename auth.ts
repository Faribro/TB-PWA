import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { createClient } from "@supabase/supabase-js"
import { normalizeRole } from "@/lib/constants/roles"
import { getCachedProfile, setCachedProfile } from "@/lib/auth-cache"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
      if (!user?.email) return false;
      
      try {
        // Check cache first (eliminates DB call for repeat logins)
        let data = getCachedProfile(user.email);
        
        if (!data) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          
          const { data: dbData, error } = await supabase
            .from('profiles')
            .select('email, is_active, role, state, district, name')
            .eq('email', user.email)
            .eq('is_active', true)
            .abortSignal(controller.signal)
            .maybeSingle();
          
          clearTimeout(timeoutId);
          
          if (error || !dbData) {
            console.error(`❌ Login rejected for ${user.email}`);
            console.error('Error:', error);
            console.error('Data:', dbData);
            return false;
          }
          
          data = dbData;
          setCachedProfile(user.email, data);
        }
        
        // Store profile data in user object for jwt callback
        (user as any).profileData = data;
        return true;
      } catch (err) {
        console.error('SignIn callback error:', err);
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