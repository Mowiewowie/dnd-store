import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api.js';
import { GoldDisplay } from '../components/GoldDisplay.jsx';

export function DMCharactersPage() {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/characters/campaign')
      .then(setCharacters)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20 text-parchment/50">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl text-gold mb-8" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>Campaign Characters</h1>

      {characters.length === 0 ? (
        <p className="text-parchment/40 text-sm">No characters have been created yet.</p>
      ) : (
        <div className="space-y-3">
          {characters.map(char => (
            <Link
              key={char.id}
              to={`/dm/characters/${char.id}`}
              className="block bg-ink border border-gold/20 hover:border-gold/50 rounded-lg p-4 transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-parchment font-semibold">{char.name}</p>
                  <p className="text-parchment/40 text-xs mt-0.5">{char.class} · {char.username}</p>
                </div>
                <GoldDisplay gp={char.gold_gp} sp={char.gold_sp} cp={char.gold_cp} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
