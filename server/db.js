import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(join(DATA_DIR, 'poker.db'));

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const SCHEMA_VERSION = '2';
const versionRow = db.prepare(`SELECT value FROM app_meta WHERE key = 'schema_version'`).get();

if (!versionRow || versionRow.value !== SCHEMA_VERSION) {
  db.exec('PRAGMA foreign_keys = OFF;');

  db.exec(`
    DROP TABLE IF EXISTS hands;
    DROP TABLE IF EXISTS session_results;
    DROP TABLE IF EXISTS home_games;
    DROP TABLE IF EXISTS sessions;
  `);

  db.exec(`
    CREATE TABLE sessions (
      id               TEXT PRIMARY KEY,
      file_hash        TEXT UNIQUE,
      filename         TEXT,
      game_type        TEXT NOT NULL,
      source           TEXT NOT NULL DEFAULT 'online',
      session_date     TEXT NOT NULL,
      notes            TEXT,
      has_hand_history INTEGER NOT NULL DEFAULT 0,
      created_at       TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE session_results (
      id          TEXT PRIMARY KEY,
      session_id  TEXT NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
      net         REAL NOT NULL,
      ev_net      REAL,
      hand_count  INTEGER NOT NULL DEFAULT 0,
      buy_in      REAL,
      cash_out    REAL,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE hands (
      id          TEXT PRIMARY KEY,
      session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      hand_ts     TEXT NOT NULL,
      net         REAL NOT NULL,
      ev_net      REAL,
      hand_index  INTEGER NOT NULL
    );

    CREATE INDEX idx_sessions_game_type ON sessions(game_type);
    CREATE INDEX idx_sessions_date ON sessions(session_date);
    CREATE INDEX idx_hands_session ON hands(session_id);
    CREATE INDEX idx_hands_ts ON hands(hand_ts);
    CREATE INDEX idx_session_results_session ON session_results(session_id);
  `);

  db.prepare(`
    INSERT INTO app_meta (key, value)
    VALUES ('schema_version', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(SCHEMA_VERSION);

  db.exec('PRAGMA foreign_keys = ON;');
}

export default db;
