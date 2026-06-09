import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { GoldDisplay } from '../components/GoldDisplay.jsx';
import { TrashIcon } from '../components/TrashIcon.jsx';
import { Toast } from '../components/Toast.jsx';
import { TabBar } from '../components/TabBar.jsx';
import { BackButton } from '../components/BackButton.jsx';
import { GoldAdjustForm } from '../components/GoldAdjustForm.jsx';
import { OrnamentDivider } from '../components/OrnamentDivider.jsx';
import { fromCP, formatGold } from '../utils/gold.js';
import { TX_LABELS } from '../utils/constants.js';
import { useToast } from '../hooks/useToast.js';

const TABS = [{ key: 'inventory', label: 'Inventory' }, { key: 'history', label: 'History' }];

export function DMCharacterPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState('inventory');
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();

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

    api.get('/characters/campaign')
      .then(list => {
        const found = list.find(c => String(c.id) === String(id));
        if (found) setCharacter(found);
      })
      .catch(() => {});
  }, [id]);

  async function handleGoldAdjust(deltaCp, notes) {
    const updated = await api.patch(`/characters/${id}/money`, {
      delta_cp: deltaCp,
      notes,
    });
    setCharacter(prev => prev ? { ...prev, ...updated } : updated);
    setTransactions(prev => [{
      id: Date.now(),
      item_name: 'Gold adjustment',
      price_paid_cp: Math.abs(deltaCp),
      quantity: 1,
      type: 'dm_adjustment',
      notes: notes || (deltaCp > 0 ? 'Gold added by DM' : 'Gold removed by DM'),
      purchased_at: new Date().toISOString(),
    }, ...prev]);
    showToast('Gold updated!');
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

  if (loading) return <div className="flex items-center justify-center py-20 text-parchment/40">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <BackButton label="Characters" onClick={() => navigate('/dm/characters')} />

      {character && (
        <>
          <h1 className="fantasy-heading text-3xl page-title-chars">{character.name}</h1>
          <div className="section-divider" />

          <div className="card-fancy p-5 mb-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-parchment/50 text-xs uppercase tracking-wider mb-1">Class</p>
                <p className="text-parchment font-semibold">{character.class}</p>
              </div>
              <div>
                <p className="text-parchment/50 text-xs uppercase tracking-wider mb-1">Player</p>
                <p className="text-parchment/70 text-sm">{character.username}</p>
              </div>
              <div>
                <p className="text-parchment/50 text-xs uppercase tracking-wider mb-1">Gold</p>
                <GoldDisplay gp={character.gold_gp} sp={character.gold_sp} cp={character.gold_cp} className="text-lg" />
              </div>
            </div>
          </div>
        </>
      )}

      <GoldAdjustForm
        onAdjust={handleGoldAdjust}
        receiveLabel="Give"
        spendLabel="Take / Deduct"
        submitLabel="Apply"
        notesPlaceholder="Reason (e.g. Quest reward, Fine, Loot)"
      />

      <TabBar tabs={TABS} activeTab={tab} onChange={setTab} />

      {tab === 'inventory' && (
        <>
          <form onSubmit={handleAddItem} className="card-fancy p-4 mb-4 space-y-2">
            <h3 className="text-parchment/70 text-xs uppercase tracking-wider">Grant Item</h3>
            <OrnamentDivider className="my-2" />
            <input
              value={itemForm.item_name}
              onChange={e => setItemForm(p => ({ ...p, item_name: e.target.value }))}
              placeholder="Item name *"
              className="input-field text-sm"
            />
            <input
              value={itemForm.item_description}
              onChange={e => setItemForm(p => ({ ...p, item_description: e.target.value }))}
              placeholder="Description (optional)"
              className="input-field text-sm"
            />
            <input
              type="number"
              min="0"
              value={itemForm.base_value_cp}
              onChange={e => setItemForm(p => ({ ...p, base_value_cp: e.target.value }))}
              placeholder="Base value (cp) — used for sell price"
              className="input-field text-sm"
            />
            {itemError && <p className="text-ember-light text-xs">{itemError}</p>}
            <button type="submit" className="btn btn-primary w-full py-2 text-sm">
              Add to Inventory
            </button>
          </form>

          {inventory.length === 0 ? (
            <p className="text-parchment/40 text-sm">No items in inventory.</p>
          ) : (
            <div className="space-y-2">
              {inventory.map((item, i) => {
                const val = item.base_value_cp ? fromCP(item.base_value_cp) : null;
                return (
                  <div key={item.id} className={`card p-3 flex justify-between items-center${i % 2 === 1 ? ' row-alt' : ''}`}>
                    <div>
                      <p className="text-parchment text-sm font-semibold">{item.item_name}</p>
                      <p className="text-parchment/40 text-xs">
                        Qty: {item.quantity}
                        {val && ` · Value: ${formatGold(val.gp, val.sp, val.cp)}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id, item.item_name)}
                      className="text-ember/50 hover:text-ember-light transition-colors p-1"
                      aria-label="Remove"
                    >
                      <TrashIcon />
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
            {transactions.map((tx, i) => {
              const { gp, sp, cp } = fromCP(tx.price_paid_cp);
              const info = TX_LABELS[tx.type] || TX_LABELS.adjustment;
              const isSale = tx.type === 'sale';
              return (
                <div key={tx.id} className={`card p-3 flex justify-between items-center${i % 2 === 1 ? ' row-alt' : ''}`}>
                  <div>
                    <p className="text-parchment text-sm font-semibold">{tx.item_name}</p>
                    <p className="text-parchment/40 text-xs">
                      <span className={`${info.color} font-semibold`}>{info.label}</span>
                      {tx.notes && ` · ${tx.notes}`}
                      {' · '}{new Date(tx.purchased_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold ${isSale ? 'text-gold-light' : 'text-parchment/60'}`}>
                    {isSale ? '+' : ''}{formatGold(gp, sp, cp)}
                  </p>
                </div>
              );
            })}
          </div>
        )
      )}

      <Toast message={toast} />
    </div>
  );
}
