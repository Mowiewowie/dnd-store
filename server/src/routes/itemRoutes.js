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

// Shared log-normal sampler (Box-Muller + rejection). Fresh random each call.
// logMin/logMid/logMax are natural logs of the value boundaries.
// bias: -2.0 (shift peak toward min) to +2.0 (shift peak toward max).
// σ is calibrated so 3σ covers midpoint to the nearer boundary → ~99.7% within range.
function bellCurveRoll(logMin, logMid, logMax, bias = 0) {
  const sigma = Math.min(logMid - logMin, logMax - logMid) / 3;
  const peak = Math.max(logMin, Math.min(logMax, logMid + bias * sigma));
  let logVal = peak;
  for (let i = 0; i < 100; i++) {
    const u1 = Math.max(Math.random(), 1e-10);
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const c = peak + sigma * z;
    if (c >= logMin && c <= logMax) { logVal = c; break; }
  }
  return Math.round(Math.exp(logVal));
}

// Magic item: random price from rarity bell curve (GP → CP).
function rarityBasedPriceCP(rarityName, bias = 0) {
  const config = RARITY_PRICES_GP[rarityName];
  if (!config) return null;
  const { min, mid, max } = config;
  const priceGP = bellCurveRoll(Math.log(min), Math.log(mid), Math.log(max), bias);
  return Math.max(min, Math.min(max, priceGP)) * 100;
}

// Equipment: SRD price is the midpoint; range is 0.5× to 2.0× SRD.
// σ = log(2)/3 ≈ 0.231 → 68% of prices within ±26% of SRD, all within 50–200%.
function equipmentVariedPriceCP(srdCP, bias = 0) {
  const min = srdCP * 0.5;
  const max = srdCP * 2.0;
  const priceCP = bellCurveRoll(Math.log(min), Math.log(srdCP), Math.log(max), bias);
  return Math.max(Math.round(min), Math.min(Math.round(max), priceCP));
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

        const baseCP = srdCostToCP(detail.cost);   // exact SRD price; null for magic items
        const rarityName = detail.rarity?.name || null;

        // Both equipment and magic items get a bell-curve-varied suggested price.
        // Equipment uses SRD as midpoint; magic items use DMG rarity range.
        let variedCP = null;
        if (baseCP) {
          variedCP = equipmentVariedPriceCP(baseCP, bias);
        } else if (rarityName) {
          variedCP = rarityBasedPriceCP(rarityName, bias);
        }

        return {
          index: item.index,
          name: item.name,
          description: itemDescription(detail),
          category: itemCategory(detail),
          srd_default_cp: variedCP,
          base_cp: baseCP,           // original SRD price for UI reference; null for magic items
          price_is_estimate: !baseCP && !!rarityName,
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
