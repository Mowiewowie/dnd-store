import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { GoldDisplay } from '../components/GoldDisplay.jsx';
import { fromCP, formatGold } from '../utils/gold.js';

const TX_LABELS = {
  purchase: { label: 'Bought', color: 'text-ember' },
  sale: { label: 'Sold', color: 'text-emerald-400' },
  adjustment: { label: 'Adjusted', color: 'text-parchment/60' },
  dm_adjustment: { label: 'DM Grant', color: 'text-gold/70' },
};

export function DMCharacterPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState('inventory');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // Gold adjustment form
  const [goldForm, setGoldForm] = useState({ amount: '', unit: 'gp', direction: 'add', notes: '' });
  const [goldError, setGoldError] = useState('');

  // Add item form
  const [itemForm, setItemForm] = useState({ item_name: '', item_description: '', base_value_cp: '' });
  const [itemError, setItemError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/characters/${id}/inventory`),
      api.get(`/characters/${id}/transactions`),
    ])
      .then(([inv, tx]) => { setInventory(inv); setTransactions(tx); })
      .catch(() => navigate('/dm/characters'))
      .finally(() => setLoading(false));

    // Get character info from campaign list
    api.get('/characters/campaign')
      .then(list => {
        const found = list.find(c => String(c.id) === String(id));
        if (found) setCharacter(found);
      })
      .catch(() => {});
  }, [id]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleGoldAdjust(e) {
    e.preventDefault();
    setGoldError('');
    const amount = parseFloat(goldForm.amount);
    if (!amount || amount <= 0) { setGoldError('Enter a positive amount'); return; }

    const multipliers = { gp: 100, sp: 10, cp: 1 };
    let deltaCp = Math.round(amount * multipliers[goldForm.unit]);
    if (goldForm.direction === 'subtract') deltaCp = -deltaCp;

    try {
      const updated = await api.patch(`/characters/${id}/money`, {
        delta_cp: deltaCp,
        notes: goldForm.notes.trim() || undefined,
      });
      setCharacter(prev => prev ? { ...prev, ...updated } : updated);
      setGoldForm({ amount: '', unit: 'gp', direction: 'add', notes: '' });
      setTransactions(prev => [{
        id: Date.now(),
        item_name: 'Gold adjustment',
        price_paid_cp: Math.abs(deltaCp),
        quantity: 1,
        type: 'dm_adjustment',
        notes: goldForm.notes.trim() || (deltaCp > 0 ? 'Gold added by DM' : 'Gold removed by DM'),
        purchased_at: new Date().toISOString(),
      }, ...prev]);
      showToast('Gold updated!');
    } catch (err) {
      setGoldError(err.message);
    }
  }

  async function handleAddItem(e) {
    e.preventDefault();
    setItemError('');
    if (!itemForm.item_name.trim()) { setItemError('Item name is required'); return; }

    try {
      const item = await api.post(`/characters/${id}/inventory`, {
        item_name: itemForm.item_name.trim(),
        item_description: itemForm.item_description.trim() || undefined,
        base_value_cp: itemForm.base_value_cp ? parseInt(itemForm.base_value_cp) : undefined,
        quantity: 1,
      });
      setInventory(prev => [item, ...prev]);
      setItemForm({ item_name: '', item_description: '', base_value_cp: '' });
      showToast(`Added ${item.item_name} to inventory!`);
    } catch (err) {
      setItemError(err.message);
    }
  }

  async function handleRemoveItem(itemId, itemName) {
    try {
      await api.delete(`/characters/${id}/inventory/${itemId}`);
      setInventory(prev => prev.filter(i => i.id !== itemId));
      showToast(`Removed ${itemName}.`);
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-parchment/50">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={() => navigate('/dm/characters')} className="text-parchment/40 hover:text-parchment text-sm mb-4">
        ← Back to Characters
      </button>

      {character && (
        <>
          <h1 className="text-3xl text-gold mb-2" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
            {character.name}
          </h1>
          <p className="text-parchment/40 text-sm mb-6">{character.class} · Player: {character.username}</p>

          <div className="bg-ink border border-gold/30 rounded-lg p-4 mb-6">
            <p className="text-parchment/50 text-xs mb-1">Current Gold</p>
            <GoldDisplay gp={character.gold_gp} sp={character.gold_sp} cp={character.gold_cp} className="text-xl" />
          </div>
        </>
      )}

      {/* Gold adjustment */}
      <div className="bg-ink border border-gold/20 rounded-lg p-4 mb-6">
        <h2 className="text-gold text-sm font-semibold mb-3" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>Adjust Gold</h2>
        <form onSubmit={handleGoldAdjust} className="space-y-2">
          <div className="flex gap-2">
            <select
              value={goldForm.direction}
              onChange={e => setGoldForm(p => ({ ...p, direction: e.target.value }))}
              className="bg-stone/20 border border-gold/20 rounded px-2 py-1.5 text-parchment text-sm focus:outline-none"
            >
              <option value="add">Give</option>
              <option value="subtract">Take / Deduct</option>
            </select>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={goldForm.amount}
              onChange={e => setGoldForm(p => ({ ...p, amount: e.target.value }))}
              placeholder="Amount"
              className="flex-1 bg-stone/20 border border-gold/20 rounded px-3 py-1.5 text-parchment text-sm focus:outline-none focus:border-gold/50"
            />
            <select
              value={goldForm.unit}
              onChange={e => setGoldForm(p => ({ ...p, unit: e.target.value }))}
              className="bg-stone/20 border border-gold/20 rounded px-2 py-1.5 text-parchment text-sm focus:outline-none"
            >
              <option value="gp">GP</option>
              <option value="sp">SP</option>
              <option value="cp">CP</option>
            </select>
          </div>
          <input
            value={goldForm.notes}
            onChange={e => setGoldForm(p => ({ ...p, notes: e.target.value }))}
            placeholder="Reason (e.g. Quest reward, Fine, Loot)"
            className="w-full bg-stone/20 border border-gold/20 rounded px-3 py-1.5 text-parchment text-sm focus:outline-none focus:border-gold/50"
          />
          {goldError && <p className="text-red-400 text-xs">{goldError}</p>}
          <button type="submit" className="w-full bg-gold/80 hover:bg-gold text-ink font-bold py-1.5 rounded text-sm transition-colors">
            Apply
          </button>
        </form>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-stone/20 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('inventory')}
          className={`px-5 py-1.5 rounded text-sm font-semibold transition-colors ${tab === 'inventory' ? 'bg-gold text-ink' : 'text-parchment/50 hover:text-parchment'}`}
        >
          Inventory
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-5 py-1.5 rounded text-sm font-semibold transition-colors ${tab === 'history' ? 'bg-gold text-ink' : 'text-parchment/50 hover:text-parchment'}`}
        >
          History
        </button>
      </div>

      {tab === 'inventory' && (
        <>
          {/* Add item form */}
          <form onSubmit={handleAddItem} className="bg-ink border border-gold/20 rounded-lg p-4 mb-4 space-y-2">
            <h3 className="text-parchment/70 text-xs font-semibold">Grant Item</h3>
            <input
              value={itemForm.item_name}
              onChange={e => setItemForm(p => ({ ...p, item_name: e.target.value }))}
              placeholder="Item name *"
              className="w-full bg-stone/20 border border-gold/20 rounded px-3 py-1.5 text-parchment text-sm focus:outline-none focus:border-gold/50"
            />
            <input
              value={itemForm.item_description}
              onChange={e => setItemForm(p => ({ ...p, item_description: e.target.value }))}
              placeholder="Description (optional)"
              className="w-full bg-stone/20 border border-gold/20 rounded px-3 py-1.5 text-parchment text-sm focus:outline-none focus:border-gold/50"
            />
            <input
              type="number"
              min="0"
              value={itemForm.base_value_cp}
              onChange={e => setItemForm(p => ({ ...p, base_value_cp: e.target.value }))}
              placeholder="Base value (cp) — used for sell price"
              className="w-full bg-stone/20 border border-gold/20 rounded px-3 py-1.5 text-parchment text-sm focus:outline-none focus:border-gold/50"
            />
            {itemError && <p className="text-red-400 text-xs">{itemError}</p>}
            <button type="submit" className="w-full bg-gold/80 hover:bg-gold text-ink font-bold py-1.5 rounded text-sm transition-colors">
              Add to Inventory
            </button>
          </form>

          {inventory.length === 0 ? (
            <p className="text-parchment/40 text-sm">No items in inventory.</p>
          ) : (
            <div className="space-y-2">
              {inventory.map(item => {
                const val = item.base_value_cp ? fromCP(item.base_value_cp) : null;
                return (
                  <div key={item.id} className="bg-ink border border-gold/20 rounded p-3 flex justify-between items-center">
                    <div>
                      <p className="text-parchment text-sm font-semibold">{item.item_name}</p>
                      <p className="text-parchment/40 text-xs">
                        Qty: {item.quantity}
                        {val && ` · Value: ${formatGold(val.gp, val.sp, val.cp)}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id, item.item_name)}
                      className="text-ember hover:text-red-400 text-xs transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        transactions.length === 0 ? (
          <p className="text-parchment/40 text-sm">No history yet.</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => {
              const { gp, sp, cp } = fromCP(tx.price_paid_cp);
              const info = TX_LABELS[tx.type] || TX_LABELS.adjustment;
              const isSale = tx.type === 'sale';
              return (
                <div key={tx.id} className="bg-ink border border-gold/20 rounded p-3 flex justify-between items-center">
                  <div>
                    <p className="text-parchment text-sm font-semibold">{tx.item_name}</p>
                    <p className="text-parchment/40 text-xs">
                      <span className={`${info.color} font-semibold`}>{info.label}</span>
                      {tx.notes && ` · ${tx.notes}`}
                      {' · '}{new Date(tx.purchased_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold ${isSale ? 'text-emerald-400' : 'text-parchment/60'}`}>
                    {isSale ? '+' : ''}{formatGold(gp, sp, cp)}
                  </p>
                </div>
              );
            })}
          </div>
        )
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-ink border border-gold/40 rounded-lg px-4 py-3 text-parchment text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
