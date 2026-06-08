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
  const desc = detail?.desc;
  if (desc) return Array.isArray(desc) ? desc.join(' ') : String(desc);
  return [...(detail?.description || []), ...(detail?.notes || [])].join(' ');
}

function itemCategory(detail) {
  if (detail?.rarity?.name) return `${detail.rarity.name} Magic Item`;
  return detail?.equipment_categories?.[0]?.name || 'Equipment';
}

router.get('/search', requireAuth, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);

  try {
    const [equipResp, magicResp] = await Promise.all([
      fetch(`${SRD_BASE}/equipment?name=${encodeURIComponent(q)}`).catch(() => null),
      fetch(`${SRD_BASE}/magic-items?name=${encodeURIComponent(q)}`).catch(() => null),
    ]);

    const equipItems = (equipResp?.ok ? (await equipResp.json()).results || [] : [])
      .map(i => ({ ...i, _type: 'equipment' }));
    const magicItems = (magicResp?.ok ? (await magicResp.json()).results || [] : [])
      .map(i => ({ ...i, _type: 'magic-items' }));

    const matches = [...equipItems, ...magicItems].slice(0, 20);

    const results = await Promise.all(
      matches.map(async item => {
        const detail = await fetchSRD(`/${item._type}/${item.index}`);
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
