import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.POKER_GRAPH_DATA_DIR || join(__dirname, '..', 'data');

mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(join(DATA_DIR, 'poker.db'));

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function tableExists(name) {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
  return !!row;
}

function columnExists(table, column) {
  if (!tableExists(table)) return false;
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some(c => c.name === column);
}

function ensureColumn(table, column, ddl) {
  if (!columnExists(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const SCHEMA_VERSION = '3';

const migrate = db.transaction(() => {
  // Core unified model tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
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

    CREATE TABLE IF NOT EXISTS session_results (
      id          TEXT PRIMARY KEY,
      session_id  TEXT NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
      net         REAL NOT NULL,
      ev_net      REAL,
      hand_count  INTEGER NOT NULL DEFAULT 0,
      buy_in      REAL,
      cash_out    REAL,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hands (
      id          TEXT PRIMARY KEY,
      session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      hand_ts     TEXT NOT NULL,
      net         REAL NOT NULL,
      ev_net      REAL,
      hand_index  INTEGER NOT NULL
    );
  `);

  // Backfill/upgrade older schemas in-place (non-destructive)
  ensureColumn('sessions', 'source', "source TEXT NOT NULL DEFAULT 'online'");
  ensureColumn('sessions', 'notes', 'notes TEXT');
  ensureColumn('sessions', 'has_hand_history', 'has_hand_history INTEGER NOT NULL DEFAULT 0');

  ensureColumn('session_results', 'ev_net', 'ev_net REAL');
  ensureColumn('session_results', 'hand_count', 'hand_count INTEGER NOT NULL DEFAULT 0');
  ensureColumn('session_results', 'buy_in', 'buy_in REAL');
  ensureColumn('session_results', 'cash_out', 'cash_out REAL');
  ensureColumn('session_results', 'created_at', "created_at TEXT DEFAULT (datetime('now'))");

  // If legacy home_games exists, migrate rows once into unified model.
  if (tableExists('home_games')) {
    db.exec(`
      INSERT OR IGNORE INTO sessions (
        id, file_hash, filename, game_type, source, session_date, notes, has_hand_history, created_at
      )
      SELECT
        id,
        NULL,
        NULL,
        'home_game',
        'home_game',
        game_date,
        notes,
        0,
        COALESCE(created_at, datetime('now'))
      FROM home_games;

      INSERT OR IGNORE INTO session_results (
        id, session_id, net, ev_net, hand_count, buy_in, cash_out, created_at
      )
      SELECT
        lower(hex(randomblob(16))),
        hg.id,
        hg.net,
        hg.net,
        0,
        hg.buy_in,
        hg.cash_out,
        COALESCE(hg.created_at, datetime('now'))
      FROM home_games hg
      LEFT JOIN session_results sr ON sr.session_id = hg.id
      WHERE sr.session_id IS NULL;
    `);
  }

  // Ensure source + hand-history flags are sensible
  db.exec(`
    UPDATE sessions
    SET source = CASE
      WHEN game_type = 'home_game' THEN 'home_game'
      ELSE COALESCE(NULLIF(source, ''), 'online')
    END;

    UPDATE sessions
    SET has_hand_history = 1
    WHERE id IN (SELECT DISTINCT session_id FROM hands);

    UPDATE sessions
    SET has_hand_history = 0
    WHERE game_type IN ('home_game', 'husng')
      AND id NOT IN (SELECT DISTINCT session_id FROM hands);
  `);

  // Backfill missing session_results from existing hand history sessions
  db.exec(`
    INSERT INTO session_results (id, session_id, net, ev_net, hand_count)
    SELECT
      lower(hex(randomblob(16))),
      s.id,
      COALESCE(SUM(h.net), 0),
      COALESCE(SUM(CASE WHEN h.ev_net IS NOT NULL THEN h.ev_net ELSE h.net END), 0),
      COUNT(h.id)
    FROM sessions s
    LEFT JOIN hands h ON h.session_id = s.id
    LEFT JOIN session_results r ON r.session_id = s.id
    WHERE r.session_id IS NULL
    GROUP BY s.id;
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_game_type ON sessions(game_type);
    CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(session_date);
    CREATE INDEX IF NOT EXISTS idx_hands_session ON hands(session_id);
    CREATE INDEX IF NOT EXISTS idx_hands_ts ON hands(hand_ts);
    CREATE INDEX IF NOT EXISTS idx_session_results_session ON session_results(session_id);
  `);

  db.prepare(`
    INSERT INTO app_meta (key, value)
    VALUES ('schema_version', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(SCHEMA_VERSION);
});

migrate();

export default db;
