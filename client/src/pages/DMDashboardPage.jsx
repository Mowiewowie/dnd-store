import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api.js';

export function DMDashboardPage() {
const [stores, setStores] = useState([]);
  const [settings, setSettings] = useState({ price_multiplier: '1.0' });
  const [newStore, setNewStore] = useState({ name: '', description: '', location: '' });
  const [multiplier, setMultiplier] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/stores'), api.get('/dm/settings')])
      .then(([s, d]) => { setStores(s); setSettings(d); setMultiplier(d.price_multiplier); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleCreateStore(e) {
    e.preventDefault();
    try {
      const store = await api.post('/stores', newStore);
      setStores(prev => [...prev, store]);
      setNewStore({ name: '', description: '', location: '' });
      showToast('Store created!');
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  }

  async function handleToggleStore(store) {
    try {
      const updated = await api.put(`/stores/${store.id}`, { is_open: !store.is_open });
      setStores(prev => prev.map(s => s.id === store.id ? updated : s));
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  }

  async function handleSaveMultiplier(e) {
    e.preventDefault();
    try {
      const updated = await api.put('/dm/settings', { price_multiplier: parseFloat(multiplier) });
      setSettings(updated);
      showToast('Price multiplier saved!');
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-parchment/50">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl text-gold mb-8" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>DM Panel</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl text-gold mb-4" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>Stores</h2>

          <div className="space-y-3 mb-6">
            {stores.length === 0 && <p className="text-parchment/40 text-sm">No stores yet.</p>}
            {stores.map(store => (
              <div key={store.id} className="bg-ink border border-gold/20 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <Link to={`/dm/stores/${store.id}`} className="text-parchment hover:text-gold font-semibold transition-colors">
                    {store.name}
                  </Link>
                  {store.location && <p className="text-parchment/40 text-xs">📍 {store.location}</p>}
                </div>
                <button
                  onClick={() => handleToggleStore(store)}
                  className={`text-xs px-3 py-1 rounded border transition-colors ${store.is_open ? 'border-green-700 text-green-400 hover:bg-green-900/20' : 'border-red-800 text-red-400 hover:bg-red-900/20'}`}
                >
                  {store.is_open ? 'Open' : 'Closed'}
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleCreateStore} className="bg-ink border border-gold/30 rounded-lg p-4 space-y-3">
            <h3 className="text-parchment font-semibold">Create Store</h3>
            <input
              value={newStore.name}
              onChange={e => setNewStore(p => ({ ...p, name: e.target.value }))}
              placeholder="Store name *"
              required
              className="w-full bg-stone/20 border border-gold/20 rounded px-3 py-2 text-parchment text-sm focus:outline-none focus:border-gold/50"
            />
            <input
              value={newStore.location}
              onChange={e => setNewStore(p => ({ ...p, location: e.target.value }))}
              placeholder="Location (optional)"
              className="w-full bg-stone/20 border border-gold/20 rounded px-3 py-2 text-parchment text-sm focus:outline-none focus:border-gold/50"
            />
            <input
              value={newStore.description}
              onChange={e => setNewStore(p => ({ ...p, description: e.target.value }))}
              placeholder="Description (optional)"
              className="w-full bg-stone/20 border border-gold/20 rounded px-3 py-2 text-parchment text-sm focus:outline-none focus:border-gold/50"
            />
            <button type="submit" className="w-full bg-gold/80 hover:bg-gold text-ink font-bold py-2 rounded text-sm transition-colors">
              Create Store
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-xl text-gold mb-4" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>Settings</h2>
          <form onSubmit={handleSaveMultiplier} className="bg-ink border border-gold/30 rounded-lg p-4 space-y-3">
            <div>
              <label className="block text-parchment/70 text-sm mb-1">Global Price Multiplier</label>
              <p className="text-parchment/40 text-xs mb-2">Scales all SRD-default prices. Custom prices are unaffected.</p>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={multiplier}
                onChange={e => setMultiplier(e.target.value)}
                className="w-full bg-stone/20 border border-gold/20 rounded px-3 py-2 text-parchment focus:outline-none focus:border-gold/50"
              />
            </div>
            <button type="submit" className="w-full bg-gold/80 hover:bg-gold text-ink font-bold py-2 rounded text-sm transition-colors">
              Save
            </button>
          </form>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-ink border border-gold/40 rounded-lg px-4 py-3 text-parchment text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
