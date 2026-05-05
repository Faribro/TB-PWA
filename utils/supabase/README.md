# Supabase SSR Integration

This project uses `@supabase/ssr` for server-side rendering with automatic session management.

## Setup

### Environment Variables

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

Note: Both `ANON_KEY` and `PUBLISHABLE_KEY` are supported for backward compatibility.

### Client Helpers

#### Browser Client (`utils/supabase/client.ts`)

Use in Client Components:

```typescript
import { createClient } from '@/utils/supabase/client';

export default function MyComponent() {
  const supabase = createClient();
  
  // Use supabase client
  const { data } = await supabase.from('patients').select();
}
```

#### Server Client (`utils/supabase/server.ts`)

Use in Server Components, Server Actions, and Route Handlers:

```typescript
import { createClient } from '@/utils/supabase/server';

export default async function MyPage() {
  const supabase = await createClient();
  
  // Use supabase client
  const { data } = await supabase.from('patients').select();
  
  return <div>{/* render data */}</div>;
}
```

#### Middleware (`utils/supabase/middleware.ts`)

Automatically integrated in `middleware.ts` to refresh user sessions on every request.

## Migration from Old Clients

### Old (lib/supabase-client.ts)
```typescript
import { createClient } from '@/lib/supabase-client';
const supabase = createClient(userEmail);
```

### New (utils/supabase/client.ts)
```typescript
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
```

### Old (lib/supabase-server.ts)
```typescript
import { getSupabaseClient } from '@/lib/supabase-server';
const supabase = getSupabaseClient();
```

### New (utils/supabase/server.ts)
```typescript
import { createClient } from '@/utils/supabase/server';
const supabase = await createClient(); // Note: async
```

## Features

- ✅ Automatic session refresh via middleware
- ✅ Cookie-based authentication
- ✅ Server-side rendering support
- ✅ Type-safe with TypeScript
- ✅ Backward compatible with existing code

## Session Management

The middleware automatically:
1. Reads session cookies from incoming requests
2. Refreshes expired tokens
3. Updates cookies in the response
4. Maintains user authentication state

No manual session management required!

## Security

- Session cookies are HTTP-only
- Tokens are automatically refreshed before expiry
- Service role key is only used server-side (never exposed to client)
- ANON key is safe to expose (has Row Level Security)

## Troubleshooting

**Issue: "Missing NEXT_PUBLIC_SUPABASE_URL"**
- Ensure `.env.local` has the correct environment variables
- Restart dev server after adding env vars

**Issue: "User not authenticated"**
- Check middleware is running (should see session refresh in network tab)
- Verify cookies are being set (check browser DevTools → Application → Cookies)
- Ensure RLS policies allow the operation

**Issue: "Cannot read properties of undefined"**
- Make sure to `await createClient()` in server components
- Check that the function is marked as `async`

## Resources

- [Supabase SSR Docs](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js 15 App Router](https://nextjs.org/docs/app)
- [Supabase Auth Helpers](https://github.com/supabase/auth-helpers)
