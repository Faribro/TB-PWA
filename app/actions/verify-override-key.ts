'use server'

export async function verifyOverrideKey(key: string): Promise<boolean> {
  // Timing-safe comparison to prevent timing attacks
  const validKey = process.env.SYSTEM_OVERRIDE_MASTER_KEY
  if (!validKey || !key) return false
  if (key.length !== validKey.length) return false
  
  // Character-by-character comparison (constant time)
  let match = true
  for (let i = 0; i < validKey.length; i++) {
    if (key[i] !== validKey[i]) match = false
  }
  return match
}
