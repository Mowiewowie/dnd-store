import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { fromCP, formatGold } from '../utils/gold.js';

function ListingCard({ listing, onBuy }) {
  const { gp, sp, cp } = fromCP(listing.effective_price_cp || 0);
  return (
    <div className="bg-stone/10 border border-gold/20 rounded-lg p-4 flex justify-between items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-parchment font-semibold truncate">{listing.item_name}</p>
        {listing.item_description && (
          <p className="text-parchment/50 text-sm mt-1 line-clamp-2">{listing.item_description}</p>
        )}
        <p className="text-parchment/40 text-xs mt-1">Qty: {listing.quantity}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-gold font-bold">{formatGold(gp, sp, cp)}</p>
        <button
          onClick={() => onBuy(listing)}
          disabled={listing.quantity < 1}
          className="mt-2 bg-gold/80 hover:bg-gold text-ink text-sm font-bold px-4 py-1.5 rounded transition-colors disabled:opacity-40"
        >
          Buy
        </button>
      </div>
    </div>
  );
}

function BuyModal({ listing, character, onConfirm, onCancel }) {
  const { gp, sp, cp } = fromCP(listing.effective_price_cp || 0);
  const totalChar = character.gold_gp * 100 + character.gold_sp * 10 + character.gold_cp;
  const canAfford = totalChar >= (listing.effective_price_cp || 0);
  const afterTotal = totalChar - (listing.effective_price_cp || 0);
  const afterBreakdown = fromCP(Math.max(0, afterTotal));

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-ink border border-gold/40 rounded-lg p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-gold mb-4" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>Confirm Purchase</h2>
        <p className="text-parchment mb-2"><span className="text-parchment/50">Item:</span> {listing.item_name}</p>
        <p className="text-parchment mb-4"><span className="text-parchment/50">Price:</span> <span className="text-gold font-bold">{formatGold(gp, sp, cp)}</span></p>
        <div className="border border-gold/20 rounded p-3 mb-4 text-sm">
          <p className="text-parchment/50 mb-1">After purchase:</p>
          <p className={canAfford ? 'text-green-400' : 'text-red-400'}>
            {formatGold(afterBreakdown.gp, afterBreakdown.sp, afterBreakdown.cp)}
          </p>
          {!canAfford && <p className="text-red-400 text-xs mt-1">Not enough gold!</p>}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={!canAfford}
            className="flex-1 bg-gold/80 hover:bg-gold text-ink font-bold py-2 rounded transition-colors disabled:opacity-40"
          >
            Buy
          </button>
          <button
            onClick={onCancel}
            className="flex-1 border border-gold/20 text-parchment/60 hover:text-parchment py-2 rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function SellModal({ item, offerCP, onConfirm, onCancel }) {
  const { gp, sp, cp } = fromCP(offerCP);
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-ink border border-gold/40 rounded-lg p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-gold mb-4" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>Confirm Sale</h2>
        <p className="text-parchment mb-2"><span className="text-parchment/50">Item:</span> {item.item_name}</p>
        <p className="text-parchment mb-4">
          <span className="text-parchment/50">Offer:</span>{' '}
          <span className="text-gold font-bold">{formatGold(gp, sp, cp)}</span>
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 bg-gold/80 hover:bg-gold text-ink font-bold py-2 rounded transition-colors"
          >
            Sell
          </button>
          <button
            onClick={onCancel}
            className="flex-1 border border-gold/20 text-parchment/60 hover:text-parchment py-2 rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function StoreDetailPage() {
  const { id } = useParams();
  const { character, selectCharacter } = useAuth();
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('buy');
  const [selectedListing, setSelectedListing] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [sellTarget, setSellTarget] = useState(null);
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.get(`/stores/${id}`)
      .then(setStore)
      .catch(() => navigate('/market'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (tab === 'sell' && character) {
      setInventoryLoading(true);
      api.get(`/characters/${character.id}/inventory`)
        .then(setInventory)
        .catch(() => {})
        .finally(() => setInventoryLoading(false));
    }
  }, [tab]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleConfirmBuy() {
    try {
      const res = await api.post('/purchase', {
        characterId: character.id,
        listingId: selectedListing.id,
        quantity: 1,
      });
      selectCharacter({ ...character, ...res.character });
      setStore(prev => ({
        ...prev,
        listings: prev.listings.map(l =>
          l.id === selectedListing.id ? { ...l, quantity: l.quantity - 1 } : l
        ),
      }));
      // Always refresh inventory so the Sell tab stays current
      api.get(`/characters/${character.id}/inventory`).then(setInventory).catch(() => {});
      showToast(`Purchased ${selectedListing.item_name}!`);
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setSelectedListing(null);
    }
  }

  async function handleConfirmSell() {
    if (!sellTarget) return;
    try {
      const res = await api.post(`/stores/${id}/sell`, {
        characterId: character.id,
        inventoryItemId: sellTarget.id,
        quantity: 1,
      });
      selectCharacter({ ...character, ...res.character });
      setInventory(prev => {
        const updated = prev.map(i => i.id === sellTarget.id ? { ...i, quantity: i.quantity - 1 } : i);
        return updated.filter(i => i.quantity > 0);
      });
      const { gp, sp, cp } = fromCP(res.gold_received_cp);
      showToast(`Sold ${sellTarget.item_name} for ${formatGold(gp, sp, cp)}!`);
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setSellTarget(null);
    }
  }

  function getOfferCP(invItem) {
    if (!invItem.base_value_cp) return 0;
    const bias = store?.price_bias ?? 0;
    const multiplier = 0.75 - bias / 8;
    return Math.max(1, Math.round(invItem.base_value_cp * multiplier));
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-parchment/50">Loading...</div>;
  }
  if (!store) return null;

  const availableListings = store.listings.filter(l => l.quantity > 0);
  const filtered = filter
    ? availableListings.filter(l => l.item_name.toLowerCase().includes(filter.toLowerCase()))
    : availableListings;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={() => navigate('/market')} className="text-parchment/40 hover:text-parchment text-sm mb-4">← Back to Market</button>

      <div className="mb-6">
        <h1 className="text-3xl text-gold" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>{store.name}</h1>
        {store.location && <p className="text-parchment/40 text-sm mt-1">📍 {store.location}</p>}
        {store.description && <p className="text-parchment/60 text-sm mt-2">{store.description}</p>}
      </div>

      {/* Buy / Sell tabs */}
      <div className="flex gap-1 mb-4 bg-stone/20 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('buy')}
          className={`px-5 py-1.5 rounded text-sm font-semibold transition-colors ${tab === 'buy' ? 'bg-gold text-ink' : 'text-parchment/50 hover:text-parchment'}`}
        >
          Buy
        </button>
        <button
          onClick={() => setTab('sell')}
          className={`px-5 py-1.5 rounded text-sm font-semibold transition-colors ${tab === 'sell' ? 'bg-gold text-ink' : 'text-parchment/50 hover:text-parchment'}`}
        >
          Sell
        </button>
      </div>

      {tab === 'buy' && (
        <>
          {availableListings.length > 4 && (
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Search items..."
              className="w-full bg-stone/20 border border-gold/20 rounded px-3 py-2 text-parchment text-sm mb-4 focus:outline-none focus:border-gold/50"
            />
          )}
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-parchment/30">
              <p>{availableListings.length === 0 ? 'This store has no items for sale.' : 'No items match your search.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(listing => (
                <ListingCard key={listing.id} listing={listing} onBuy={setSelectedListing} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'sell' && (
        <>
          <p className="text-parchment/40 text-xs mb-3">
            This store buys at{' '}
            <span className="text-gold">{Math.round((0.75 - (store.price_bias ?? 0) / 8) * 100)}%</span>
            {' '}of item value.
          </p>
          {inventoryLoading ? (
            <p className="text-parchment/40 text-sm">Loading inventory...</p>
          ) : inventory.length === 0 ? (
            <p className="text-parchment/40 text-sm">Your inventory is empty. Buy some items first!</p>
          ) : (
            <div className="space-y-3">
              {inventory.map(item => {
                const offerCP = getOfferCP(item);
                const { gp, sp, cp } = fromCP(offerCP);
                return (
                  <div key={item.id} className="bg-stone/10 border border-gold/20 rounded-lg p-4 flex justify-between items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-parchment font-semibold truncate">{item.item_name}</p>
                      {item.item_description && (
                        <p className="text-parchment/50 text-sm mt-1 line-clamp-2">{item.item_description}</p>
                      )}
                      <p className="text-parchment/40 text-xs mt-1">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-gold font-bold">{offerCP > 0 ? formatGold(gp, sp, cp) : '—'}</p>
                      <button
                        onClick={() => setSellTarget(item)}
                        disabled={offerCP === 0}
                        className="mt-2 border border-gold/50 hover:bg-gold/10 text-gold text-sm font-bold px-4 py-1.5 rounded transition-colors disabled:opacity-40"
                      >
                        Sell
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {selectedListing && character && (
        <BuyModal
          listing={selectedListing}
          character={character}
          onConfirm={handleConfirmBuy}
          onCancel={() => setSelectedListing(null)}
        />
      )}

      {sellTarget && (
        <SellModal
          item={sellTarget}
          offerCP={getOfferCP(sellTarget)}
          onConfirm={handleConfirmSell}
          onCancel={() => setSellTarget(null)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-ink border border-gold/40 rounded-lg px-4 py-3 text-parchment text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
