# Fix Alpha-Tester Claim API Production Issue

## Goal
Migrate `alpha_tester_counter` from SQLite to Supabase so alpha-tester numbers persist across Render deploys.

## Tasks

- [x] Audit current SQLite implementation in johnny5-db.ts
- [x] Create Supabase migration SQL (`db/supabase-alpha-tester-counter.sql`)
- [x] Update `claimAlphaTesterNumber()` in johnny5-db.ts to use Supabase
- [x] Update API route to await async function
- [x] TypeScript check passes
- [ ] Mike: Run SQL in Supabase dashboard
- [ ] Deploy to Render

## Review

### Changes Made

1. **Created Supabase migration SQL** (`db/supabase-alpha-tester-counter.sql`)
   - Creates `alpha_tester_counter` table with `(id, n)` columns
   - Creates `increment_alpha_tester_counter()` RPC function for atomic increment

2. **Updated `claimAlphaTesterNumber()`** (`lib/johnny5-db.ts`)
   - Changed from sync SQLite to async Supabase
   - Uses RPC function for atomic increment
   - Returns Promise<number> instead of number

3. **Updated API route** (`app/api/alpha-tester/claim/route.ts`)
   - Added `await` to handle async function

### Deployment Steps (Mike)

1. **Run SQL in Supabase Dashboard**:
   - Go to: https://supabase.com/dashboard/project/xeomjefoxeqfjidzwhpv/sql/new
   - Paste contents of `db/supabase-alpha-tester-counter.sql`
   - Execute

2. **Deploy to Render**:
   - Push code changes
   - Deploy should work automatically

### Test After Deployment

```bash
curl -X POST https://coder1.dev/api/alpha-tester/claim
```

Should return: `{"number": 1}` (or next number)
