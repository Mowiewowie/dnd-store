import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api.js';
import { StatusBadge } from '../components/StatusBadge.jsx';

export function MarketPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stores')
      .then(setStores)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-parchment/40">Loading stores...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="fantasy-heading text-3xl page-title-market">The Adventurer's Bazaar</h1>
      <div className="section-divider" />
      <p className="text-parchment/40 text-sm mb-8">Choose a shop to browse their wares</p>

      {stores.length === 0 ? (
        <div className="text-center py-20 text-parchment/30">
          <div className="text-4xl mb-4 text-gold/20 select-none">✦ ✦ ✦</div>
          <p className="text-parchment/40">No shops are open at this time.</p>
          <p className="text-parchment/25 text-sm mt-2">The dungeon master has not yet opened any stores.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stores.map(store => (
            <Link
              key={store.id}
              to={`/market/${store.id}`}
              className="card-fancy hover:border-gold/60 p-5 transition-all group block"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <h2 className="text-parchment font-bold text-lg group-hover:text-gold transition-colors truncate"
                      style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
                    {store.name}
                  </h2>
                  {store.location && (
                    <p className="text-parchment/40 text-sm mt-1">{store.location}</p>
                  )}
                  {store.description && (
                    <p className="text-parchment/50 text-sm mt-2 line-clamp-2">{store.description}</p>
                  )}
                </div>
                <div className="shrink-0 mt-0.5">
                  <StatusBadge isOpen={store.is_open} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
