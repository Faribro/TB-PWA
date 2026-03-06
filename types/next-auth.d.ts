import { DefaultSession, DefaultJWT } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      role: string
      state: string
      district: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role: string
    state: string
    district: string
  }
}