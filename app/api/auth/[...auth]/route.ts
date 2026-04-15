import { handlers } from "@/auth"

export const runtime = 'edge'
export const maxDuration = 10

export const { GET, POST } = handlers
