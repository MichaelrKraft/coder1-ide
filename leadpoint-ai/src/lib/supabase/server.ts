import { createServerClient, type SupabaseClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Check if Supabase is properly configured
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return false;
  if (url.includes('your-') || url.includes('your_') || url === 'your-supabase-url') return false;
  if (key.includes('your-') || key.includes('your_')) return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;

  return true;
}

export function isDevMode(): boolean {
  return !isSupabaseConfigured();
}

export async function createClient(): Promise<SupabaseClient | null> {
  // Return null if Supabase is not configured (dev mode)
  if (!isSupabaseConfigured()) {
    console.warn('[Supabase Server] Not configured - running in dev mode');
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
