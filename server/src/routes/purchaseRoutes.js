import { Router } from 'express';
import { getDb } from '../db.js';
import { requireAuth, requireCampaign } from '../auth.js';
import { toCP, fromCP } from '../gold.js';

const router = Router();

router.post('/', requireAuth, requireCampaign, (req, res) => {
  const { characterId, listingId, quantity = 1 } = req.body;

  if (!characterId || !listingId) {
    return res.status(400).json({ error: 'characterId and listingId are required' });
  }
  if (quantity < 1) {
    return res.status(400).json({ error: 'Quantity must be at least 1' });
  }

  const db = getDb();

  const character = db.prepare(
    'SELECT id, user_id, campaign_id, gold_gp, gold_sp, gold_cp FROM characters WHERE id = ?'
  ).get(characterId);
  if (!character) return res.status(404).json({ error: 'Character not found' });
  if (character.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (character.campaign_id !== req.campaignId) return res.status(403).json({ error: 'Character not in this campaign' });

  const listing = db.prepare(
    `SELECT l.*, s.is_open, s.campaign_id AS store_campaign_id FROM listings l
     JOIN stores s ON l.store_id = s.id
     WHERE l.id = ?`
  ).get(listingId);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (!listing.is_open) return res.status(400).json({ error: 'Store is closed' });
  if (listing.store_campaign_id !== req.campaignId) return res.status(403).json({ error: 'Store not in this campaign' });
  if (listing.quantity < quantity) {
    return res.status(400).json({ error: 'Not enough stock' });
  }

  const multiplierKey = `campaign_${req.campaignId}_price_multiplier`;
  const multiplierRow = db.prepare('SELECT value FROM dm_settings WHERE key = ?').get(multiplierKey);
  const multiplier = parseFloat(multiplierRow?.value || '1.0');

  const unitPriceCp = listing.custom_price_cp != null
    ? listing.custom_price_cp
    : Math.round((listing.srd_default_cp ?? 0) * multiplier);
  const totalCostCp = unitPriceCp * quantity;

  const characterTotalCp = toCP(character.gold_gp, character.gold_sp, character.gold_cp);
  if (characterTotalCp < totalCostCp) {
    return res.status(400).json({ error: 'Insufficient gold' });
  }

  const newTotalCp = characterTotalCp - totalCostCp;
  const { gp, sp, cp } = fromCP(newTotalCp);

  db.exec('BEGIN');
  try {
    db.prepare(
      'UPDATE characters SET gold_gp = ?, gold_sp = ?, gold_cp = ? WHERE id = ?'
    ).run(gp, sp, cp, characterId);

    db.prepare(
      'UPDATE listings SET quantity = quantity - ? WHERE id = ?'
    ).run(quantity, listingId);

    const txResult = db.prepare(
      `INSERT INTO transactions (character_id, listing_id, item_name, price_paid_cp, quantity)
       VALUES (?, ?, ?, ?, ?)`
    ).run(characterId, listingId, listing.item_name, totalCostCp, quantity);

    db.exec('COMMIT');

    const txId = Number(txResult.lastInsertRowid);
    const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId);
    const updatedCharacter = db.prepare(
      'SELECT id, name, gold_gp, gold_sp, gold_cp FROM characters WHERE id = ?'
    ).get(characterId);

    res.json({ transaction, character: updatedCharacter });
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
});

export default router;
