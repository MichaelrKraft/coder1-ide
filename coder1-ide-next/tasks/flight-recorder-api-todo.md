# Flight Recorder: Server-Side API Routes & Event Writer

## Plan

- [ ] 1. Create `lib/flight-recorder/writer.ts` — FlightRecorderWriter class (~130 lines)
  - Singleton pattern with `getInstance()`
  - `processBatch()`: scrub sensitive fields, extract searchable text, persist via storage
  - `createTerminalSnapshot()`: create snapshot events
  - Track last snapshot time per session (5-min interval)
  - Track if secrets were detected per batch

- [ ] 2. Create `app/api/flight-recorder/events/route.ts` — POST batch ingestion (~70 lines)
  - Handle both `application/json` and `text/plain` (sendBeacon)
  - Validate sessionId + events array
  - Process through writer, return processed count + secretsDetected flag

- [ ] 3. Create `app/api/flight-recorder/sessions/route.ts` — GET list sessions (~60 lines)
  - Query params: limit, offset, starred, search
  - Return sessions sorted by started_at DESC

- [ ] 4. Create `app/api/flight-recorder/sessions/[id]/route.ts` — GET/DELETE/PATCH single session (~80 lines)
  - GET: session detail + event count breakdown by type
  - DELETE: remove session + all associated data
  - PATCH: star/unstar, rename

- [ ] 5. Create `app/api/flight-recorder/sessions/[id]/events/route.ts` — GET paginated events (~80 lines)
  - Query params: start, end, types, limit, offset, search
  - Return events filtered and paginated

- [ ] 6. Create `app/api/flight-recorder/cleanup/route.ts` — POST retention cleanup (~50 lines)
  - Trigger retention cleanup
  - Rate limit: once per 24 hours
  - Return count of sessions cleaned up

- [ ] 7. Read back all files and verify imports/correctness

## Key Decisions

- Use `export const dynamic = 'force-dynamic'` on all routes (matches existing pattern)
- Use lazy getter for storage to keep Node-only `better-sqlite3` from bundling into client
- Use lazy getter for writer too (it depends on storage + scrubber)
- Match existing error response pattern: `{ error: 'message' }` with appropriate status codes
- No auth for now (flight recorder is local-only) — can add later with existing `extractUserId` pattern
