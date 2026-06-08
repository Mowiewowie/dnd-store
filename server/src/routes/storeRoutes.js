import { Router } from 'express';
import { getDb } from '../db.js';
import { requireAuth, requireDM, requireCampaign } from '../auth.js';

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

router.post('/', requireDM, requireCampaign, (req, res) => {
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

router.put('/:id', requireDM, requireCampaign, (req, res) => {
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

router.delete('/:id', requireDM, requireCampaign, (req, res) => {
  const db = getDb();
  const store = db.prepare('SELECT id, campaign_id FROM stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  if (store.campaign_id !== req.campaignId) return res.status(403).json({ error: 'Store not in your campaign' });
  db.prepare('DELETE FROM stores WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/:id/listings', requireDM, requireCampaign, (req, res) => {
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
