import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../utils/api.js';
import { GoldDisplay } from '../components/GoldDisplay.jsx';
import { fromCP, formatGold } from '../utils/gold.js';

export function CharacterPage() {
  const { character } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!character) return;
    api.get(`/characters/${character.id}/transactions`)
      .then(setTransactions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [character?.id]);

  if (!character) return null;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl text-gold mb-6" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
        {character.name}
      </h1>

      <div className="bg-ink border border-gold/30 rounded-lg p-5 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-parchment/50 text-sm mb-1">Class</p>
            <p className="text-parchment font-semibold">{character.class}</p>
          </div>
          <div>
            <p className="text-parchment/50 text-sm mb-1">Gold</p>
            <GoldDisplay gp={character.gold_gp} sp={character.gold_sp} cp={character.gold_cp} className="text-lg" />
          </div>
        </div>
      </div>

      <h2 className="text-xl text-gold mb-4" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
        Purchase History
      </h2>

      {loading ? (
        <p className="text-parchment/40 text-sm">Loading...</p>
      ) : transactions.length === 0 ? (
        <p className="text-parchment/40 text-sm">No purchases yet. Head to the market!</p>
      ) : (
        <div className="space-y-2">
          {transactions.map(tx => {
            const { gp, sp, cp } = fromCP(tx.price_paid_cp);
            return (
              <div key={tx.id} className="bg-ink border border-gold/20 rounded p-3 flex justify-between items-center">
                <div>
                  <p className="text-parchment text-sm font-semibold">{tx.item_name}</p>
                  <p className="text-parchment/40 text-xs">{new Date(tx.purchased_at).toLocaleDateString()}</p>
                </div>
                <p className="text-gold text-sm font-semibold">{formatGold(gp, sp, cp)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
