import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../utils/api.js';
import { GoldDisplay } from '../components/GoldDisplay.jsx';
import { OrnamentDivider } from '../components/OrnamentDivider.jsx';
import { Toast } from '../components/Toast.jsx';
import { fromCP, formatGold } from '../utils/gold.js';

const TX_LABELS = {
  purchase:      { label: 'Bought',   color: 'text-ember' },
  sale:          { label: 'Sold',     color: 'text-gold-light' },
  adjustment:    { label: 'Adjusted', color: 'text-parchment/60' },
  dm_adjustment: { label: 'DM Grant', color: 'text-gold/70' },
};

export function CharacterPage() {
  const { character, selectCharacter } = useAuth();
  const [tab, setTab] = useState('inventory');
  const [transactions, setTransactions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [invLoading, setInvLoading] = useState(true);
  const [goldForm, setGoldForm] = useState({ amount: '', unit: 'gp', direction: 'add', notes: '' });
  const [goldError, setGoldError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!character) return;
    api.get(`/characters/${character.id}/inventory`)
      .then(setInventory)
      .catch(() => {})
      .finally(() => setInvLoading(false));
  }, [character?.id]);

  useEffect(() => {
    if (tab !== 'history' || !character || transactions.length > 0) return;
    setTxLoading(true);
    api.get(`/characters/${character.id}/transactions`)
      .then(setTransactions)
      .catch(() => {})
      .finally(() => setTxLoading(false));
  }, [tab]);

  if (!character) return null;

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
      const updated = await api.patch(`/characters/${character.id}/money`, {
        delta_cp: deltaCp,
        notes: goldForm.notes.trim() || undefined,
      });
      selectCharacter({ ...character, ...updated });
      setGoldForm({ amount: '', unit: 'gp', direction: 'add', notes: '' });
      setTransactions(prev => prev.length > 0 ? [{
        id: Date.now(),
        item_name: 'Gold adjustment',
        price_paid_cp: Math.abs(deltaCp),
        quantity: 1,
        type: 'adjustment',
        notes: goldForm.notes.trim() || (deltaCp > 0 ? 'Gold added' : 'Gold removed'),
        purchased_at: new Date().toISOString(),
      }, ...prev] : prev);
      showToast('Gold updated!');
    } catch (err) {
      setGoldError(err.message);
    }
  }

  async function handleRemoveItem(itemId) {
    try {
      await api.delete(`/characters/${character.id}/inventory/${itemId}`);
      setInventory(prev => prev.filter(i => i.id !== itemId));
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="fantasy-heading text-3xl">{character.name}</h1>
      <div className="section-divider" />

      {/* Character summary */}
      <div className="card-fancy p-5 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-parchment/50 text-xs uppercase tracking-wider mb-1">Class</p>
            <p className="text-parchment font-semibold">{character.class}</p>
          </div>
          <div>
            <p className="text-parchment/50 text-xs uppercase tracking-wider mb-1">Gold</p>
            <GoldDisplay gp={character.gold_gp} sp={character.gold_sp} cp={character.gold_cp} className="text-lg" />
          </div>
        </div>
      </div>

      {/* Gold adjustment */}
      <div className="card-fancy p-4 mb-6">
        <h2 className="fantasy-heading text-sm mb-1">Adjust Gold</h2>
        <OrnamentDivider className="my-2" />
        <form onSubmit={handleGoldAdjust} className="space-y-2">
          <div className="flex gap-2">
            <select
              value={goldForm.direction}
              onChange={e => setGoldForm(p => ({ ...p, direction: e.target.value }))}
              className="input-field text-sm !w-auto"
              style={{ colorScheme: 'dark' }}
            >
              <option value="add">Receive</option>
              <option value="subtract">Spend / Lose</option>
            </select>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={goldForm.amount}
              onChange={e => setGoldForm(p => ({ ...p, amount: e.target.value }))}
              placeholder="Amount"
              className="input-field text-sm flex-1"
            />
            <select
              value={goldForm.unit}
              onChange={e => setGoldForm(p => ({ ...p, unit: e.target.value }))}
              className="input-field text-sm !w-auto"
              style={{ colorScheme: 'dark' }}
            >
              <option value="gp">GP</option>
              <option value="sp">SP</option>
              <option value="cp">CP</option>
            </select>
          </div>
          <input
            value={goldForm.notes}
            onChange={e => setGoldForm(p => ({ ...p, notes: e.target.value }))}
            placeholder="Reason (e.g. Quest reward, Gambling)"
            className="input-field text-sm"
          />
          {goldError && <p className="text-ember-light text-xs">{goldError}</p>}
          <button type="submit" className="btn btn-primary w-full py-2 text-sm">
            Log Change
          </button>
        </form>
      </div>

      {/* Tab bar — bottom border indicator */}
      <div className="flex border-b border-gold/20 mb-6">
        {[{ key: 'inventory', label: 'Inventory' }, { key: 'history', label: 'History' }].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-6 pb-2 text-sm font-semibold transition-colors ${
              tab === key
                ? 'text-gold border-b-2 border-gold -mb-px'
                : 'text-parchment/40 hover:text-parchment/70'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'inventory' && (
        invLoading ? (
          <p className="text-parchment/40 text-sm">Loading...</p>
        ) : inventory.length === 0 ? (
          <p className="text-parchment/40 text-sm">No items yet. Head to the market!</p>
        ) : (
          <div className="space-y-2">
            {inventory.map(item => (
              <div key={item.id} className="card p-3 flex justify-between items-center">
                <div>
                  <p className="text-parchment text-sm font-semibold">{item.item_name}</p>
                  <p className="text-parchment/40 text-xs">Qty: {item.quantity}</p>
                </div>
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-ember/60 hover:text-ember-light text-xs transition-colors"
                >
                  Discard
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'history' && (
        txLoading ? (
          <p className="text-parchment/40 text-sm">Loading...</p>
        ) : transactions.length === 0 ? (
          <p className="text-parchment/40 text-sm">No history yet.</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => {
              const { gp, sp, cp } = fromCP(tx.price_paid_cp);
              const info = TX_LABELS[tx.type] || TX_LABELS.adjustment;
              const isSale = tx.type === 'sale';
              return (
                <div key={tx.id} className="card p-3 flex justify-between items-center">
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
