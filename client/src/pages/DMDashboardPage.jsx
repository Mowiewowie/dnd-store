import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { Toast } from '../components/Toast.jsx';
import { OrnamentDivider } from '../components/OrnamentDivider.jsx';

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

  if (loading) return <div className="flex items-center justify-center py-20 text-parchment/40">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="fantasy-heading text-3xl mb-8">Markets</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Stores column */}
        <div>
          <h2 className="fantasy-heading text-xl mb-4">Stores</h2>

          <div className="space-y-2 mb-6">
            {stores.length === 0 && <p className="text-parchment/40 text-sm">No stores yet.</p>}
            {stores.map(store => (
              <div key={store.id} className="card p-3 flex justify-between items-center gap-3">
                <div className="min-w-0">
                  <Link to={`/dm/stores/${store.id}`} className="text-parchment hover:text-gold font-semibold transition-colors text-sm">
                    {store.name}
                  </Link>
                  {store.location && <p className="text-parchment/35 text-xs mt-0.5">{store.location}</p>}
                </div>
                <button
                  onClick={() => handleToggleStore(store)}
                  className="shrink-0 transition-opacity hover:opacity-80"
                  title={store.is_open ? 'Click to close' : 'Click to open'}
                >
                  <StatusBadge isOpen={store.is_open} />
                </button>
              </div>
            ))}
          </div>

          <OrnamentDivider />

          <form onSubmit={handleCreateStore} className="card-fancy p-4 space-y-3">
            <h3 className="text-parchment/70 text-xs uppercase tracking-wider">Create Store</h3>
            <input
              value={newStore.name}
              onChange={e => setNewStore(p => ({ ...p, name: e.target.value }))}
              placeholder="Store name *"
              required
              className="input-field text-sm"
            />
            <input
              value={newStore.location}
              onChange={e => setNewStore(p => ({ ...p, location: e.target.value }))}
              placeholder="Location (optional)"
              className="input-field text-sm"
            />
            <input
              value={newStore.description}
              onChange={e => setNewStore(p => ({ ...p, description: e.target.value }))}
              placeholder="Description (optional)"
              className="input-field text-sm"
            />
            <button type="submit" className="btn btn-primary w-full py-2 text-sm">
              Create Store
            </button>
          </form>
        </div>

        {/* Settings column */}
        <div>
          <h2 className="fantasy-heading text-xl mb-4">Settings</h2>
          <form onSubmit={handleSaveMultiplier} className="card-fancy p-4 space-y-3">
            <div>
              <label className="block text-parchment/60 text-xs uppercase tracking-wider mb-1.5">
                Global Price Multiplier
              </label>
              <p className="text-parchment/35 text-xs mb-3">Scales all SRD-default prices. Custom prices are unaffected.</p>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={multiplier}
                onChange={e => setMultiplier(e.target.value)}
                className="input-field"
              />
            </div>
            <OrnamentDivider className="my-1" />
            <button type="submit" className="btn btn-primary w-full py-2 text-sm">
              Save
            </button>
          </form>
        </div>
      </div>

      <Toast message={toast} />
    </div>
  );
}
