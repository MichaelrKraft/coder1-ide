-- Bridge Pairing Codes - For persistent authentication (Added Feb 1, 2026)
-- Replaces in-memory Map to support multi-process/restarts in production
CREATE TABLE IF NOT EXISTS bridge_pairing_codes (
    code TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires INTEGER NOT NULL, -- Timestamp
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bridge_pairing_codes_expires ON bridge_pairing_codes(expires);
