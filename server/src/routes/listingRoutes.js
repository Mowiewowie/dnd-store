import { Router } from 'express';
import { getDb } from '../db.js';
import { requireDM } from '../auth.js';

const router = Router();

router.put('/:id', requireDM, (req, res) => {
  const { item_name, item_description, custom_price_cp, srd_default_cp, quantity } = req.body;
  const db = getDb();
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  db.prepare(
    `UPDATE listings SET
      item_name = ?,
      item_description = ?,
      custom_price_cp = ?,
      srd_default_cp = ?,
      quantity = ?
     WHERE id = ?`
  ).run(
    item_name ?? listing.item_name,
    item_description !== undefined ? item_description : listing.item_description,
    custom_price_cp !== undefined ? custom_price_cp : listing.custom_price_cp,
    srd_default_cp !== undefined ? srd_default_cp : listing.srd_default_cp,
    quantity ?? listing.quantity,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM listings WHERE id = ?').get(Number(req.params.id)));
});

router.delete('/:id', requireDM, (req, res) => {
  const db = getDb();
  const listing = db.prepare('SELECT id FROM listings WHERE id = ?').get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  db.prepare('DELETE FROM listings WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
