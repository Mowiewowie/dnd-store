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

  if (loading) return <div className="flex items-center justify-center py-20 text-parchment/40">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="fantasy-heading text-3xl mb-8">Campaign Characters</h1>

      {characters.length === 0 ? (
        <p className="text-parchment/40 text-sm">No characters have been created yet.</p>
      ) : (
        <div className="space-y-3">
          {characters.map(char => (
            <Link
              key={char.id}
              to={`/dm/characters/${char.id}`}
              className="card-fancy block hover:border-gold/60 p-4 transition-all group"
            >
              <div className="flex justify-between items-center gap-4">
                <div className="min-w-0">
                  <p className="text-parchment font-semibold group-hover:text-gold transition-colors"
                     style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
                    {char.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-parchment/40 text-xs border border-gold/15 rounded px-1.5 py-0.5">
                      {char.class}
                    </span>
                    <span className="text-parchment/30 text-xs">{char.username}</span>
                  </div>
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
