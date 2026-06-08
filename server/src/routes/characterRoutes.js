import { Router } from 'express';
import { getDb } from '../db.js';
import { requireAuth, requireCampaign } from '../auth.js';

const router = Router();

router.get('/', requireAuth, requireCampaign, (req, res) => {
  const db = getDb();
  const characters = db.prepare(
    'SELECT id, name, class, gold_gp, gold_sp, gold_cp FROM characters WHERE user_id = ? AND campaign_id = ?'
  ).all(req.user.id, req.campaignId);
  res.json(characters);
});

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

router.get('/:id/transactions', requireAuth, requireCampaign, (req, res) => {
  const db = getDb();
  const character = db.prepare('SELECT id, user_id, campaign_id FROM characters WHERE id = ?').get(req.params.id);
  if (!character) return res.status(404).json({ error: 'Character not found' });
  if (character.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (character.campaign_id !== req.campaignId) return res.status(403).json({ error: 'Forbidden' });

  const transactions = db.prepare(
    `SELECT id, item_name, price_paid_cp, quantity, purchased_at
     FROM transactions WHERE character_id = ? ORDER BY purchased_at DESC`
  ).all(req.params.id);
  res.json(transactions);
});

export default router;
