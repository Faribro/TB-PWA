import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
  trustHost: true,
  basePath: "/api/auth",
  callbacks: {
    async signIn({ user }) {
      console.log('SignIn callback:', { email: user.email })
      if (!user.email) return false
      
      // For now, allow all users to test the flow
      return true
    },
    async redirect({ url, baseUrl }) {
      console.log('Redirect callback:', { url, baseUrl })
      if (url === baseUrl) return `${baseUrl}/dashboard`
      if (url.startsWith(baseUrl)) return url
      return `${baseUrl}/dashboard`
    },
    async jwt({ token, trigger }) {
      console.log('JWT callback:', { trigger, email: token.email })
      if (trigger === "signIn" && token.email) {
        // Add mock data for testing
        token.role = 'M&E'
        token.state = 'Maharashtra'
        token.district = 'Mumbai'
      }
      return token
    },
    async session({ session, token }) {
      console.log('Session callback:', { token })
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