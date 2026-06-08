import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { fromCP, formatGold } from '../utils/gold.js';

export function DMStorePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ item_name: '', item_description: '', custom_price_cp: '', quantity: 1 });
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/stores/${id}`)
      .then(setStore)
      .catch(() => navigate('/dm'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await api.get(`/items/search?q=${encodeURIComponent(search)}`);
        setSearchResults(results);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  function selectSRDItem(item) {
    setSelected(item);
    const { gp, sp, cp } = fromCP(item.srd_default_cp || 0);
    setForm({
      item_name: item.name,
      item_description: item.description,
      custom_price_cp: String(item.srd_default_cp || ''),
      quantity: 1,
    });
    setSearch('');
    setSearchResults([]);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleAddListing(e) {
    e.preventDefault();
    try {
      const listing = await api.post(`/stores/${id}/listings`, {
        item_srd_index: selected?.index || null,
        item_name: form.item_name,
        item_description: form.item_description,
        custom_price_cp: form.custom_price_cp ? parseInt(form.custom_price_cp) : null,
        srd_default_cp: selected?.srd_default_cp || null,
        quantity: parseInt(form.quantity),
      });
      setStore(prev => ({ ...prev, listings: [...prev.listings, { ...listing, effective_price_cp: listing.custom_price_cp }] }));
      setForm({ item_name: '', item_description: '', custom_price_cp: '', quantity: 1 });
      setSelected(null);
      showToast('Listing added!');
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  }

  async function handleDeleteListing(listingId) {
    try {
      await api.delete(`/listings/${listingId}`);
      setStore(prev => ({ ...prev, listings: prev.listings.filter(l => l.id !== listingId) }));
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-parchment/50">Loading...</div>;
  if (!store) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate('/dm')} className="text-parchment/40 hover:text-parchment text-sm mb-4">← Back to DM Panel</button>
      <h1 className="text-3xl text-gold mb-8" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>{store.name} — Listings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl text-gold mb-4" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>Add Item</h2>
          <form onSubmit={handleAddListing} className="bg-ink border border-gold/30 rounded-lg p-4 space-y-3">
            <div className="relative">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search D&D items (e.g. longsword)..."
                className="w-full bg-stone/20 border border-gold/20 rounded px-3 py-2 text-parchment text-sm focus:outline-none focus:border-gold/50"
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full bg-ink border border-gold/30 rounded mt-1 max-h-48 overflow-y-auto shadow-xl">
                  {searchResults.map(item => (
                    <button
                      key={item.index}
                      type="button"
                      onClick={() => selectSRDItem(item)}
                      className="w-full text-left px-3 py-2 text-parchment text-sm hover:bg-stone/20 flex justify-between"
                    >
                      <span>{item.name}</span>
                      <span className="text-gold text-xs">{item.srd_default_cp ? formatGold(...Object.values(fromCP(item.srd_default_cp))) : '—'}</span>
                    </button>
                  ))}
                </div>
              )}
              {searching && <p className="text-parchment/40 text-xs mt-1">Searching...</p>}
            </div>
            <input
              value={form.item_name}
              onChange={e => setForm(p => ({ ...p, item_name: e.target.value }))}
              placeholder="Item name *"
              required
              className="w-full bg-stone/20 border border-gold/20 rounded px-3 py-2 text-parchment text-sm focus:outline-none focus:border-gold/50"
            />
            <textarea
              value={form.item_description}
              onChange={e => setForm(p => ({ ...p, item_description: e.target.value }))}
              placeholder="Description (optional)"
              rows={2}
              className="w-full bg-stone/20 border border-gold/20 rounded px-3 py-2 text-parchment text-sm focus:outline-none focus:border-gold/50 resize-none"
            />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-parchment/50 text-xs mb-1">Price (CP) *</label>
                <input
                  type="number"
                  min="0"
                  value={form.custom_price_cp}
                  onChange={e => setForm(p => ({ ...p, custom_price_cp: e.target.value }))}
                  placeholder="0"
                  required
                  className="w-full bg-stone/20 border border-gold/20 rounded px-3 py-2 text-parchment text-sm focus:outline-none focus:border-gold/50"
                />
                {form.custom_price_cp && (
                  <p className="text-gold text-xs mt-1">{formatGold(...Object.values(fromCP(parseInt(form.custom_price_cp) || 0)))}</p>
                )}
              </div>
              <div>
                <label className="block text-parchment/50 text-xs mb-1">Qty</label>
                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                  className="w-20 bg-stone/20 border border-gold/20 rounded px-3 py-2 text-parchment text-sm focus:outline-none focus:border-gold/50"
                />
              </div>
            </div>
            <button type="submit" className="w-full bg-gold/80 hover:bg-gold text-ink font-bold py-2 rounded text-sm transition-colors">
              Add to Store
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-xl text-gold mb-4" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>Current Listings ({store.listings.length})</h2>
          {store.listings.length === 0 ? (
            <p className="text-parchment/40 text-sm">No items listed yet.</p>
          ) : (
            <div className="space-y-2">
              {store.listings.map(listing => {
                const price = listing.effective_price_cp ?? listing.custom_price_cp ?? 0;
                const { gp, sp, cp } = fromCP(price);
                return (
                  <div key={listing.id} className="bg-ink border border-gold/20 rounded p-3 flex justify-between items-center">
                    <div>
                      <p className="text-parchment text-sm font-semibold">{listing.item_name}</p>
                      <p className="text-parchment/40 text-xs">Qty: {listing.quantity} · {formatGold(gp, sp, cp)}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteListing(listing.id)}
                      className="text-ember hover:text-red-400 text-xs transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
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
