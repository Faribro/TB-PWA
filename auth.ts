import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false
      
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?email=eq.${user.email}&select=email,role,state,district,is_active`, {
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
            'Content-Type': 'application/json'
          }
        })
        
        const profiles = await response.json()
        const profile = profiles[0]
        
        if (!profile || !profile.is_active) {
          return "/unauthorized"
        }
        
        return true
      } catch (error) {
        return false
      }
    },
    async redirect({ url, baseUrl }) {
      // Always redirect to dashboard after successful sign-in
      if (url === baseUrl) return `${baseUrl}/dashboard`
      // Allow callback URLs on same origin
      if (url.startsWith(baseUrl)) return url
      return `${baseUrl}/dashboard`
    },
    async jwt({ token, trigger }) {
      if (trigger === "signIn" && token.email) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?email=eq.${token.email}&select=role,state,district`, {
            headers: {
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
              'Content-Type': 'application/json'
            }
          })
          
          const profiles = await response.json()
          const profile = profiles[0]
          
          if (profile) {
            token.role = profile.role
            token.state = profile.state
            token.district = profile.district
          }
        } catch (error) {
          console.error('JWT callback error:', error)
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role as string
        session.user.state = token.state as string
        session.user.district = token.district as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
})