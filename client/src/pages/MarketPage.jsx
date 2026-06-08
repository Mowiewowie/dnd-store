import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api.js';

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
    return <div className="flex items-center justify-center py-20 text-parchment/50">Loading stores...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl text-gold mb-2" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
        The Adventurer's Bazaar
      </h1>
      <p className="text-parchment/50 text-sm mb-8">Choose a shop to browse their wares</p>

      {stores.length === 0 ? (
        <div className="text-center py-20 text-parchment/30">
          <p className="text-5xl mb-4">🏚</p>
          <p>No shops are open at this time.</p>
          <p className="text-sm mt-2">The dungeon master has not yet opened any stores.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stores.map(store => (
            <Link
              key={store.id}
              to={`/market/${store.id}`}
              className="bg-ink border border-gold/30 hover:border-gold/70 rounded-lg p-5 transition-all group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-parchment font-bold text-lg group-hover:text-gold transition-colors" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
                    {store.name}
                  </h2>
                  {store.location && (
                    <p className="text-parchment/40 text-sm mt-1">📍 {store.location}</p>
                  )}
                  {store.description && (
                    <p className="text-parchment/60 text-sm mt-2">{store.description}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded border ${store.is_open ? 'text-green-400 border-green-700' : 'text-red-400 border-red-800'}`}>
                  {store.is_open ? 'Open' : 'Closed'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
