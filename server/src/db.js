import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/store.db');

let db;

export function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
    migrate(db);
  }
  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'player' CHECK(role IN ('player', 'dm')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      class TEXT NOT NULL DEFAULT 'Adventurer',
      gold_gp INTEGER NOT NULL DEFAULT 50,
      gold_sp INTEGER NOT NULL DEFAULT 0,
      gold_cp INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      location TEXT,
      is_open INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      item_srd_index TEXT,
      item_name TEXT NOT NULL,
      item_description TEXT,
      custom_price_cp INTEGER,
      srd_default_cp INTEGER,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL REFERENCES characters(id),
      listing_id INTEGER,
      item_name TEXT NOT NULL,
      price_paid_cp INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      purchased_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dm_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO dm_settings (key, value) VALUES ('price_multiplier', '1.0');
  `);
}
