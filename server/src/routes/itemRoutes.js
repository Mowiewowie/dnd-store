import { Router } from 'express';
import { getDb } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
const SRD_BASE = 'https://www.dnd5eapi.co/api/2024';

async function fetchSRD(path) {
  const db = getDb();
  const cacheKey = `srd_cache_2024_${path.replace(/[\/?=&]/g, '_')}`;
  const cached = db.prepare('SELECT value FROM dm_settings WHERE key = ?').get(cacheKey);
  if (cached) return JSON.parse(cached.value);

  const response = await fetch(`${SRD_BASE}${path}`);
  if (!response.ok) return null;
  const data = await response.json();
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

function itemDescription(detail) {
  return [...(detail?.description || []), ...(detail?.notes || [])].join(' ');
}

function itemCategory(detail) {
  return detail?.equipment_categories?.[0]?.name || 'Equipment';
}

router.get('/search', requireAuth, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);

  try {
    // Use server-side name filtering — no need to fetch the full list
    const listResp = await fetch(`${SRD_BASE}/equipment?name=${encodeURIComponent(q)}`);
    if (!listResp.ok) return res.json([]);
    const data = await listResp.json();

    const matches = (data.results || []).slice(0, 20);

    const results = await Promise.all(
      matches.map(async item => {
        const detail = await fetchSRD(`/equipment/${item.index}`);
        if (!detail) return null;
        return {
          index: item.index,
          name: item.name,
          description: itemDescription(detail),
          category: itemCategory(detail),
          srd_default_cp: srdCostToCP(detail.cost),
          weight: detail.weight || null,
        };
      })
    );
    res.json(results.filter(Boolean));
  } catch (err) {
    console.error('[items/search] fetch failed:', err.message);
    res.status(503).json({ error: 'Item database unavailable', detail: err.message });
  }
});

router.get('/:index', requireAuth, async (req, res) => {
  try {
    const data = await fetchSRD(`/equipment/${req.params.index}`);
    if (!data) return res.status(404).json({ error: 'Item not found' });
    res.json({
      index: data.index,
      name: data.name,
      description: itemDescription(data),
      category: itemCategory(data),
      srd_default_cp: srdCostToCP(data.cost),
      weight: data.weight || null,
    });
  } catch (err) {
    console.error('[items/:index] fetch failed:', err.message);
    res.status(503).json({ error: 'Item database unavailable', detail: err.message });
  }
});

export default router;
