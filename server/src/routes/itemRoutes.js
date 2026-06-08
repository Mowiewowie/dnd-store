import { Router } from 'express';
import { getDb } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
const SRD_BASE = 'https://www.dnd5eapi.co/api/2024';

// 2024 DMG Chapter 7 price ranges (GP) by rarity.
// Legendary bounds derived algorithmically from the lower rarities:
//   min: 500,000 gp (DMG stated floor)
//   mid: min × (10/3) ≈ 1,500,000 gp  (Uncommon/Rare/Very Rare all use this 3.33× ratio)
//   max: mid × 4.05 ≈ 6,000,000 gp    (max/mid ratio grows ×1.5 per tier: 1.8 → 2.7 → 4.05)
const RARITY_PRICES_GP = {
  'Common':    { min: 50,      mid: 75,       max: 100      },
  'Uncommon':  { min: 150,     mid: 500,      max: 900      },
  'Rare':      { min: 1500,    mid: 5000,     max: 9000     },
  'Very Rare': { min: 15000,   mid: 50000,    max: 135000   },
  'Legendary': { min: 500000,  mid: 1500000,  max: 6000000  },
};

// FNV-1a hash → deterministic seed from item index string
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

// Xorshift32 PRNG step
function xorshift32(n) {
  let s = n === 0 ? 1 : n;
  s ^= s << 13; s ^= s >> 17; s ^= s << 5;
  return s >>> 0;
}

// Log-normal bell curve price in CP, deterministic per itemIndex.
// Works in log space: mean = log(mid) + bias*σ, where σ is chosen so 3σ covers
// midpoint to the nearer range boundary → ~99.7% of samples land within [min, max].
// bias: -2.0 (Generous/cheap) to +2.0 (Cutthroat/expensive); 0 = neutral.
// Uses Box-Muller + rejection sampling seeded by item index for consistency.
function rarityBasedPriceCP(rarityName, itemIndex, bias = 0) {
  const config = RARITY_PRICES_GP[rarityName];
  if (!config) return null;
  const { min, mid, max } = config;

  const logMin = Math.log(min);
  const logMid = Math.log(mid);
  const logMax = Math.log(max);
  const sigma = Math.min(logMid - logMin, logMax - logMid) / 3;

  // Shift the peak by bias*σ, clamped so it stays inside [logMin, logMax]
  const shiftedMid = Math.max(logMin, Math.min(logMax, logMid + bias * sigma));

  let s = fnv1a(String(itemIndex));
  let logPrice = shiftedMid;

  for (let i = 0; i < 100; i++) {
    s = xorshift32(s);
    const u1 = Math.max((s >>> 0) / 0x100000000, 1e-10);
    s = xorshift32(s);
    const u2 = (s >>> 0) / 0x100000000;
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const candidate = shiftedMid + sigma * z;
    if (candidate >= logMin && candidate <= logMax) { logPrice = candidate; break; }
  }

  const priceGP = Math.max(min, Math.min(max, Math.round(Math.exp(logPrice))));
  return priceGP * 100; // GP → CP
}

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
  const bias = Math.max(-2, Math.min(2, parseFloat(req.query.bias) || 0));

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
        const rawCP = srdCostToCP(detail.cost);
        const rarityName = detail.rarity?.name || null;
        const priceIsEstimate = !rawCP && !!rarityName;
        const estimatedCP = priceIsEstimate ? rarityBasedPriceCP(rarityName, item.index, bias) : null;
        return {
          index: item.index,
          name: item.name,
          description: itemDescription(detail),
          category: itemCategory(detail),
          srd_default_cp: rawCP ?? estimatedCP,
          price_is_estimate: priceIsEstimate,
          rarity: rarityName,
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
