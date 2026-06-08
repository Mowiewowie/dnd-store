import { closeDb } from '../db.js';

export function resetDb() {
  closeDb();
}
