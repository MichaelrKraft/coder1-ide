'use strict';

const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = process.env.DATABASE_PATH || './j5-licenses.db';

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDb() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS j5_licenses (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      stripe_session_id TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      first_activated_at DATETIME,
      revoked INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS j5_activations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_id TEXT REFERENCES j5_licenses(id),
      machine_id TEXT NOT NULL,
      hostname TEXT,
      activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(license_id, machine_id)
    );
  `);

  return database;
}

function createLicense(email, sessionId) {
  const database = getDb();
  const key = uuidv4();

  database
    .prepare('INSERT INTO j5_licenses (id, email, stripe_session_id) VALUES (?, ?, ?)')
    .run(key, email, sessionId);

  return key;
}

function getLicense(key) {
  return getDb()
    .prepare('SELECT * FROM j5_licenses WHERE id = ?')
    .get(key);
}

function getLicenseBySession(sessionId) {
  return getDb()
    .prepare('SELECT * FROM j5_licenses WHERE stripe_session_id = ?')
    .get(sessionId);
}

function getLicenseByEmail(email) {
  return getDb()
    .prepare('SELECT * FROM j5_licenses WHERE email = ?')
    .all(email);
}

function getActivations(licenseId) {
  return getDb()
    .prepare('SELECT * FROM j5_activations WHERE license_id = ?')
    .all(licenseId);
}

function addActivation(licenseId, machineId, hostname) {
  getDb()
    .prepare('INSERT OR IGNORE INTO j5_activations (license_id, machine_id, hostname) VALUES (?, ?, ?)')
    .run(licenseId, machineId, hostname || null);
}

function removeActivation(licenseId, machineId) {
  getDb()
    .prepare('DELETE FROM j5_activations WHERE license_id = ? AND machine_id = ?')
    .run(licenseId, machineId);
}

function revokeLicense(licenseId) {
  getDb()
    .prepare('UPDATE j5_licenses SET revoked = 1 WHERE id = ?')
    .run(licenseId);
}

function markFirstActivated(licenseId) {
  getDb()
    .prepare('UPDATE j5_licenses SET first_activated_at = CURRENT_TIMESTAMP WHERE id = ? AND first_activated_at IS NULL')
    .run(licenseId);
}

module.exports = {
  initDb,
  createLicense,
  getLicense,
  getLicenseBySession,
  getLicenseByEmail,
  getActivations,
  addActivation,
  removeActivation,
  revokeLicense,
  markFirstActivated,
};
