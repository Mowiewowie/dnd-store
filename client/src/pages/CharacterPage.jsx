import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../utils/api.js';
import { GoldDisplay } from '../components/GoldDisplay.jsx';
import { TrashIcon } from '../components/TrashIcon.jsx';
import { Toast } from '../components/Toast.jsx';
import { TabBar } from '../components/TabBar.jsx';
import { GoldAdjustForm } from '../components/GoldAdjustForm.jsx';
import { fromCP, formatGold } from '../utils/gold.js';
import { TX_LABELS } from '../utils/constants.js';
import { useToast } from '../hooks/useToast.js';

const TABS = [{ key: 'inventory', label: 'Inventory' }, { key: 'history', label: 'History' }];

export function CharacterPage() {
  const { character, selectCharacter } = useAuth();
  const [tab, setTab] = useState('inventory');
  const [transactions, setTransactions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [invLoading, setInvLoading] = useState(true);
  const { toast, showToast } = useToast();

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

  async function handleGoldAdjust(deltaCp, notes) {
    const updated = await api.patch(`/characters/${character.id}/money`, {
      delta_cp: deltaCp,
      notes,
    });
    selectCharacter({ ...character, ...updated });
    setTransactions(prev => prev.length > 0 ? [{
      id: Date.now(),
      item_name: 'Gold adjustment',
      price_paid_cp: Math.abs(deltaCp),
      quantity: 1,
      type: 'adjustment',
      notes: notes || (deltaCp > 0 ? 'Gold added' : 'Gold removed'),
      purchased_at: new Date().toISOString(),
    }, ...prev] : prev);
    showToast('Gold updated!');
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

      <GoldAdjustForm
        onAdjust={handleGoldAdjust}
        receiveLabel="Receive"
        spendLabel="Spend / Lose"
        submitLabel="Log Change"
        notesPlaceholder="Reason (e.g. Quest reward, Gambling)"
      />

      <TabBar tabs={TABS} activeTab={tab} onChange={setTab} />

      {tab === 'inventory' && (
        invLoading ? (
          <p className="text-parchment/40 text-sm">Loading...</p>
        ) : inventory.length === 0 ? (
          <p className="text-parchment/40 text-sm">No items yet. Head to the market!</p>
        ) : (
          <div className="space-y-2">
            {inventory.map((item, i) => (
              <div key={item.id} className={`card p-3 flex justify-between items-center${i % 2 === 1 ? ' row-alt' : ''}`}>
                <div>
                  <p className="text-parchment text-sm font-semibold">{item.item_name}</p>
                  <p className="text-parchment/40 text-xs">Qty: {item.quantity}</p>
                </div>
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-ember/50 hover:text-ember-light transition-colors p-1"
                  aria-label="Discard"
                >
                  <TrashIcon />
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
