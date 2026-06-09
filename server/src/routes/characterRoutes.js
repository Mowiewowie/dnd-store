import { Router } from 'express';
import { getDb } from '../db.js';
import { requireAuth, requireCampaign } from '../auth.js';
import { toCP, fromCP } from '../gold.js';

const router = Router();

function canAccessCharacter(req, character) {
  if (!character) return false;
  if (character.campaign_id !== req.campaignId) return false;
  return req.user.role === 'dm' || character.user_id === req.user.id;
}

// GET /characters — player's own characters in campaign
router.get('/', requireAuth, requireCampaign, (req, res) => {
  const db = getDb();
  const characters = db.prepare(
    'SELECT id, name, class, gold_gp, gold_sp, gold_cp FROM characters WHERE user_id = ? AND campaign_id = ?'
  ).all(req.user.id, req.campaignId);
  res.json(characters);
});

// GET /characters/campaign — DM: all characters in campaign
router.get('/campaign', requireAuth, requireCampaign, (req, res) => {
  if (req.user.role !== 'dm') return res.status(403).json({ error: 'DM access required' });
  const db = getDb();
  const characters = db.prepare(
    `SELECT c.id, c.name, c.class, c.gold_gp, c.gold_sp, c.gold_cp, u.username
     FROM characters c
     JOIN users u ON c.user_id = u.id
     WHERE c.campaign_id = ?
     ORDER BY u.username, c.name`
  ).all(req.campaignId);
  res.json(characters);
});

// POST /characters — create character
router.post('/', requireAuth, requireCampaign, (req, res) => {
  const { name, class: charClass = 'Adventurer', gold_gp = 50, gold_sp = 0, gold_cp = 0 } = req.body;
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Character name is required' });
  }

  const db = getDb();
  const existing = db.prepare(
    'SELECT id FROM characters WHERE user_id = ? AND campaign_id = ? AND name = ?'
  ).get(req.user.id, req.campaignId, name.trim());
  if (existing) {
    return res.status(409).json({ error: 'You already have a character with that name in this campaign' });
  }

  const result = db.prepare(
    'INSERT INTO characters (user_id, campaign_id, name, class, gold_gp, gold_sp, gold_cp) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(req.user.id, req.campaignId, name.trim(), charClass.trim(), gold_gp, gold_sp, gold_cp);

  const character = db.prepare(
    'SELECT id, name, class, gold_gp, gold_sp, gold_cp FROM characters WHERE id = ?'
  ).get(Number(result.lastInsertRowid));
  res.status(201).json(character);
});

// DELETE /characters/:id — player deletes their own character
router.delete('/:id', requireAuth, requireCampaign, (req, res) => {
  const db = getDb();
  const character = db.prepare(
    'SELECT id, user_id, campaign_id FROM characters WHERE id = ?'
  ).get(req.params.id);

  if (!character) return res.status(404).json({ error: 'Character not found' });
  if (character.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (character.campaign_id !== req.campaignId) return res.status(403).json({ error: 'Forbidden' });

  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM transactions WHERE character_id = ?').run(req.params.id);
    db.prepare('DELETE FROM characters WHERE id = ?').run(req.params.id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  res.json({ ok: true });
});

// GET /characters/:id/transactions — player-own or DM
router.get('/:id/transactions', requireAuth, requireCampaign, (req, res) => {
  const db = getDb();
  const character = db.prepare('SELECT id, user_id, campaign_id FROM characters WHERE id = ?').get(req.params.id);
  if (!character) return res.status(404).json({ error: 'Character not found' });
  if (!canAccessCharacter(req, character)) return res.status(403).json({ error: 'Forbidden' });

  const transactions = db.prepare(
    `SELECT id, item_name, price_paid_cp, quantity, type, notes, purchased_at
     FROM transactions WHERE character_id = ? ORDER BY purchased_at DESC`
  ).all(req.params.id);
  res.json(transactions);
});

// PATCH /characters/:id/money — adjust gold (player-own or DM)
// Body: { delta_cp: number, notes: string }
router.patch('/:id/money', requireAuth, requireCampaign, (req, res) => {
  const { delta_cp, notes } = req.body;
  if (typeof delta_cp !== 'number' || !Number.isInteger(delta_cp) || delta_cp === 0) {
    return res.status(400).json({ error: 'delta_cp must be a non-zero integer (copper pieces to add/subtract)' });
  }

  const db = getDb();
  const character = db.prepare(
    'SELECT id, user_id, campaign_id, gold_gp, gold_sp, gold_cp FROM characters WHERE id = ?'
  ).get(req.params.id);
  if (!character) return res.status(404).json({ error: 'Character not found' });
  if (!canAccessCharacter(req, character)) return res.status(403).json({ error: 'Forbidden' });

  const currentCP = toCP(character.gold_gp, character.gold_sp, character.gold_cp);
  const newCP = currentCP + delta_cp;
  if (newCP < 0) return res.status(400).json({ error: 'Cannot reduce gold below zero' });

  const { gp, sp, cp } = fromCP(newCP);
  const txType = req.user.role === 'dm' ? 'dm_adjustment' : 'adjustment';
  const txNotes = notes?.trim() || (delta_cp > 0 ? 'Gold added' : 'Gold removed');

  db.exec('BEGIN');
  try {
    db.prepare('UPDATE characters SET gold_gp = ?, gold_sp = ?, gold_cp = ? WHERE id = ?').run(gp, sp, cp, req.params.id);
    db.prepare(
      `INSERT INTO transactions (character_id, item_name, price_paid_cp, quantity, type, notes)
       VALUES (?, ?, ?, 1, ?, ?)`
    ).run(req.params.id, 'Gold adjustment', Math.abs(delta_cp), txType, txNotes);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  const updated = db.prepare('SELECT id, name, gold_gp, gold_sp, gold_cp FROM characters WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// GET /characters/:id/inventory — player-own or DM
router.get('/:id/inventory', requireAuth, requireCampaign, (req, res) => {
  const db = getDb();
  const character = db.prepare('SELECT id, user_id, campaign_id FROM characters WHERE id = ?').get(req.params.id);
  if (!character) return res.status(404).json({ error: 'Character not found' });
  if (!canAccessCharacter(req, character)) return res.status(403).json({ error: 'Forbidden' });

  const inventory = db.prepare(
    'SELECT * FROM character_inventory WHERE character_id = ? ORDER BY acquired_at DESC'
  ).all(req.params.id);
  res.json(inventory);
});

// POST /characters/:id/inventory — DM adds item to character
router.post('/:id/inventory', requireAuth, requireCampaign, (req, res) => {
  if (req.user.role !== 'dm') return res.status(403).json({ error: 'DM access required' });
  const { item_name, item_description, item_srd_index, quantity = 1, base_value_cp, rarity } = req.body;
  if (!item_name || item_name.trim().length === 0) {
    return res.status(400).json({ error: 'Item name is required' });
  }
  if (quantity < 1) return res.status(400).json({ error: 'Quantity must be at least 1' });

  const db = getDb();
  const character = db.prepare('SELECT id, campaign_id FROM characters WHERE id = ?').get(req.params.id);
  if (!character) return res.status(404).json({ error: 'Character not found' });
  if (character.campaign_id !== req.campaignId) return res.status(403).json({ error: 'Character not in your campaign' });

  const result = db.prepare(
    `INSERT INTO character_inventory (character_id, item_name, item_description, item_srd_index, quantity, base_value_cp, rarity)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    req.params.id,
    item_name.trim(),
    item_description || null,
    item_srd_index || null,
    quantity,
    base_value_cp != null ? base_value_cp : null,
    rarity || null
  );

  const item = db.prepare('SELECT * FROM character_inventory WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json(item);
});

// DELETE /characters/:id/inventory/:itemId — DM or player-own
router.delete('/:id/inventory/:itemId', requireAuth, requireCampaign, (req, res) => {
  const db = getDb();
  const character = db.prepare('SELECT id, user_id, campaign_id FROM characters WHERE id = ?').get(req.params.id);
  if (!character) return res.status(404).json({ error: 'Character not found' });
  if (!canAccessCharacter(req, character)) return res.status(403).json({ error: 'Forbidden' });

  const item = db.prepare('SELECT * FROM character_inventory WHERE id = ? AND character_id = ?').get(req.params.itemId, req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found in inventory' });

  db.prepare('DELETE FROM character_inventory WHERE id = ?').run(req.params.itemId);
  res.json({ ok: true });
});

export default router;
