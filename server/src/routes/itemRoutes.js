import { Router } from 'express';
import { getDb } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
const SRD_BASE = 'https://www.dnd5eapi.co/api';

async function fetchSRD(path) {
  const db = getDb();
  const cacheKey = `srd_cache_${path.replace(/\//g, '_')}`;
  const cached = db.prepare('SELECT value FROM dm_settings WHERE key = ?').get(cacheKey);
  if (cached) return JSON.parse(cached.value);

  const res = await fetch(`${SRD_BASE}${path}`);
  if (!res.ok) return null;
  const data = await res.json();
  db.prepare('INSERT OR REPLACE INTO dm_settings (key, value) VALUES (?, ?)').run(
    cacheKey, JSON.stringify(data)
  );
  return data;
}

function srdCostToCP(cost) {
  if (!cost) return null;
  const { quantity, unit } = cost;
  if (unit === 'gp') return quantity * 100;
  if (unit === 'sp') return quantity * 10;
  if (unit === 'cp') return quantity;
  return null;
}

router.get('/search', requireAuth, async (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q) return res.json([]);

  try {
    const data = await fetchSRD('/equipment');
    if (!data) return res.json([]);

    const matches = data.results
      .filter(item => item.name.toLowerCase().includes(q))
      .slice(0, 20);

    const results = await Promise.all(
      matches.map(async item => {
        const detail = await fetchSRD(`/equipment/${item.index}`);
        return {
          index: item.index,
          name: item.name,
          description: detail?.desc?.join(' ') || '',
          category: detail?.equipment_category?.name || 'Equipment',
          srd_default_cp: srdCostToCP(detail?.cost),
          weight: detail?.weight || null,
        };
      })
    );
    res.json(results.filter(Boolean));
  } catch {
    res.status(503).json({ error: 'Item database unavailable' });
  }
});

router.get('/:index', requireAuth, async (req, res) => {
  try {
    const data = await fetchSRD(`/equipment/${req.params.index}`);
    if (!data) return res.status(404).json({ error: 'Item not found' });
    res.json({
      index: data.index,
      name: data.name,
      description: data.desc?.join(' ') || '',
      category: data.equipment_category?.name || 'Equipment',
      srd_default_cp: srdCostToCP(data.cost),
      weight: data.weight || null,
    });
  } catch {
    res.status(503).json({ error: 'Item database unavailable' });
  }
});

export default router;
