import { getDb, closeDb } from '../db.js';

export function resetDb() {
  // Truncate all data between tests so fixed-name fixtures don't collide across runs
  try {
    const db = getDb();
    db.exec(`
      DELETE FROM transactions;
      DELETE FROM listings;
      DELETE FROM stores;
      DELETE FROM characters;
      DELETE FROM campaign_members;
      DELETE FROM campaigns;
      DELETE FROM dm_settings;
      DELETE FROM users;
    `);
  } catch {
    // DB might not be initialized yet on first call — that's fine
  }
  closeDb();
}
