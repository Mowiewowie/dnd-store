import { Router } from 'express';
import { getDb } from '../db.js';
import { requireAuth, requireCampaign, requireCampaignDM } from '../auth.js';
import { toCP, fromCP } from '../gold.js';

// bias: -2 (Generous) → 1.0, 0 (Impartial) → 0.75, +2 (Cutthroat) → 0.50
function buyMultiplier(bias) {
  return 0.75 - bias / 8;
}

const router = Router();

function getEffectivePrice(listing, multiplier) {
  if (listing.custom_price_cp != null) return listing.custom_price_cp;
  if (listing.srd_default_cp != null) return Math.round(listing.srd_default_cp * multiplier);
  return 0;
}

router.get('/', requireAuth, requireCampaign, (req, res) => {
  const db = getDb();
  const isDM = req.user.role === 'dm';
  const stores = isDM
    ? db.prepare('SELECT * FROM stores WHERE campaign_id = ? ORDER BY name').all(req.campaignId)
    : db.prepare('SELECT * FROM stores WHERE campaign_id = ? AND is_open = 1 ORDER BY name').all(req.campaignId);
  res.json(stores);
});

router.post('/', requireCampaignDM, (req, res) => {
  const { name, description, location } = req.body;
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Store name is required' });
  }
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO stores (campaign_id, name, description, location) VALUES (?, ?, ?, ?)'
  ).run(req.campaignId, name.trim(), description || null, location || null);
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json(store);
});

router.get('/:id', requireAuth, requireCampaign, (req, res) => {
  const db = getDb();
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  if (store.campaign_id !== req.campaignId) return res.status(403).json({ error: 'Store not in your campaign' });
  if (!store.is_open && req.user.role !== 'dm') {
    return res.status(403).json({ error: 'Store is closed' });
  }

  const multiplierKey = `campaign_${req.campaignId}_price_multiplier`;
  const multiplierRow = db.prepare('SELECT value FROM dm_settings WHERE key = ?').get(multiplierKey);
  const multiplier = parseFloat(multiplierRow?.value || '1.0');

  const rawListings = db.prepare(
    'SELECT * FROM listings WHERE store_id = ? ORDER BY item_name'
  ).all(req.params.id);

  const listings = rawListings.map(l => ({
    ...l,
    effective_price_cp: getEffectivePrice(l, multiplier),
  }));

  res.json({ ...store, listings });
});

router.put('/:id', requireCampaignDM, (req, res) => {
  const { name, description, location, is_open } = req.body;
  const db = getDb();
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  if (store.campaign_id !== req.campaignId) return res.status(403).json({ error: 'Store not in your campaign' });

  db.prepare(
    'UPDATE stores SET name = ?, description = ?, location = ?, is_open = ? WHERE id = ?'
  ).run(
    name ?? store.name,
    description !== undefined ? description : store.description,
    location !== undefined ? location : store.location,
    is_open !== undefined ? (is_open ? 1 : 0) : store.is_open,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id));
});

// Update Merchant's Temperament (price bias) for a store
// bias: -2.0 (Generous) to +2.0 (Cutthroat), shifts the bell curve peak
router.patch('/:id/temperament', requireCampaignDM, (req, res) => {
  const bias = parseFloat(req.body.bias);
  if (isNaN(bias) || bias < -2 || bias > 2) {
    return res.status(400).json({ error: 'bias must be a number between -2 and 2' });
  }
  const db = getDb();
  const store = db.prepare('SELECT id, campaign_id FROM stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  if (store.campaign_id !== req.campaignId) return res.status(403).json({ error: 'Store not in your campaign' });

  db.prepare('UPDATE stores SET price_bias = ? WHERE id = ?').run(bias, req.params.id);
  res.json({ price_bias: bias });
});

// POST /:id/sell — player sells an inventory item to this store
router.post('/:id/sell', requireAuth, requireCampaign, (req, res) => {
  const { characterId, inventoryItemId, quantity = 1 } = req.body;
  if (!characterId || !inventoryItemId) {
    return res.status(400).json({ error: 'characterId and inventoryItemId are required' });
  }
  if (quantity < 1) return res.status(400).json({ error: 'Quantity must be at least 1' });

  const db = getDb();

  const store = db.prepare('SELECT id, campaign_id, is_open, price_bias FROM stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  if (!store.is_open) return res.status(400).json({ error: 'Store is closed' });
  if (store.campaign_id !== req.campaignId) return res.status(403).json({ error: 'Store not in your campaign' });

  const character = db.prepare(
    'SELECT id, user_id, campaign_id, gold_gp, gold_sp, gold_cp FROM characters WHERE id = ?'
  ).get(characterId);
  if (!character) return res.status(404).json({ error: 'Character not found' });
  if (character.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (character.campaign_id !== req.campaignId) return res.status(403).json({ error: 'Character not in this campaign' });

  const invItem = db.prepare(
    'SELECT * FROM character_inventory WHERE id = ? AND character_id = ?'
  ).get(inventoryItemId, characterId);
  if (!invItem) return res.status(404).json({ error: 'Item not found in your inventory' });
  if (invItem.quantity < quantity) return res.status(400).json({ error: 'Not enough of that item' });

  // Calculate sell price: base_value_cp × buy multiplier; 0 if no base value
  const baseCP = invItem.base_value_cp || 0;
  const multiplier = buyMultiplier(store.price_bias ?? 0);
  const offerPerUnit = Math.max(1, Math.round(baseCP * multiplier));
  const totalOfferCP = offerPerUnit * quantity;

  const currentCP = toCP(character.gold_gp, character.gold_sp, character.gold_cp);
  const { gp, sp, cp } = fromCP(currentCP + totalOfferCP);

  db.exec('BEGIN');
  try {
    db.prepare('UPDATE characters SET gold_gp = ?, gold_sp = ?, gold_cp = ? WHERE id = ?').run(gp, sp, cp, characterId);

    if (invItem.quantity === quantity) {
      db.prepare('DELETE FROM character_inventory WHERE id = ?').run(inventoryItemId);
    } else {
      db.prepare('UPDATE character_inventory SET quantity = quantity - ? WHERE id = ?').run(quantity, inventoryItemId);
    }

    db.prepare(
      `INSERT INTO transactions (character_id, item_name, price_paid_cp, quantity, type, notes)
       VALUES (?, ?, ?, ?, 'sale', ?)`
    ).run(characterId, invItem.item_name, totalOfferCP, quantity, `Sold to store`);

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  const updatedCharacter = db.prepare('SELECT id, name, gold_gp, gold_sp, gold_cp FROM characters WHERE id = ?').get(characterId);
  res.json({ gold_received_cp: totalOfferCP, character: updatedCharacter });
});

router.delete('/:id', requireCampaignDM, (req, res) => {
  const db = getDb();
  const store = db.prepare('SELECT id, campaign_id FROM stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  if (store.campaign_id !== req.campaignId) return res.status(403).json({ error: 'Store not in your campaign' });
  db.prepare('DELETE FROM stores WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/:id/listings', requireCampaignDM, (req, res) => {
  const { item_srd_index, item_name, item_description, custom_price_cp, srd_default_cp, quantity = 1 } = req.body;
  if (!item_name || item_name.trim().length === 0) {
    return res.status(400).json({ error: 'Item name is required' });
  }
  if (quantity < 1) {
    return res.status(400).json({ error: 'Quantity must be at least 1' });
  }

  const db = getDb();
  const store = db.prepare('SELECT id, campaign_id FROM stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  if (store.campaign_id !== req.campaignId) return res.status(403).json({ error: 'Store not in your campaign' });

  const result = db.prepare(
    `INSERT INTO listings (store_id, item_srd_index, item_name, item_description, custom_price_cp, srd_default_cp, quantity)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    req.params.id,
    item_srd_index || null,
    item_name.trim(),
    item_description || null,
    custom_price_cp != null ? custom_price_cp : null,
    srd_default_cp != null ? srd_default_cp : null,
    quantity
  );

  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json(listing);
});

export default router;
