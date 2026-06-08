import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../utils/api.js';
import { GoldDisplay } from '../components/GoldDisplay.jsx';

const CLASSES = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard', 'Adventurer'];

export function CharacterSelectPage() {
  const { selectCharacter } = useAuth();
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [charClass, setCharClass] = useState('Fighter');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/characters').then(setCharacters).catch(() => {});
  }, []);

  function handleSelect(char) {
    selectCharacter(char);
    navigate('/market');
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const char = await api.post('/characters', { name, class: charClass });
      setCharacters(prev => [...prev, char]);
      selectCharacter(char);
      navigate('/market');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1208] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl text-gold text-center mb-2" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
          Choose Your Character
        </h1>
        <p className="text-parchment/50 text-center text-sm mb-8">Who ventures to the bazaar today?</p>

        {characters.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {characters.map(char => (
              <button
                key={char.id}
                onClick={() => handleSelect(char)}
                className="bg-ink border border-gold/30 hover:border-gold/70 rounded-lg p-4 text-left transition-all hover:bg-stone/10 group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-parchment font-bold text-lg group-hover:text-gold transition-colors">
                      {char.name}
                    </p>
                    <p className="text-parchment/50 text-sm">{char.class}</p>
                  </div>
                  <GoldDisplay gp={char.gold_gp} sp={char.gold_sp} cp={char.gold_cp} className="text-sm" />
                </div>
              </button>
            ))}
          </div>
        )}

        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full border border-dashed border-gold/30 hover:border-gold/60 rounded-lg p-4 text-parchment/50 hover:text-parchment transition-all text-sm"
          >
            + Create New Character
          </button>
        ) : (
          <form onSubmit={handleCreate} className="bg-ink border border-gold/30 rounded-lg p-6 space-y-4">
            <h2 className="text-gold" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>New Character</h2>
            <div>
              <label className="block text-parchment/70 text-sm mb-1">Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-stone/20 border border-gold/20 rounded px-3 py-2 text-parchment focus:outline-none focus:border-gold/60"
                placeholder="Character name"
                required
              />
            </div>
            <div>
              <label className="block text-parchment/70 text-sm mb-1">Class</label>
              <select
                value={charClass}
                onChange={e => setCharClass(e.target.value)}
                className="w-full bg-stone/20 border border-gold/20 rounded px-3 py-2 text-parchment focus:outline-none focus:border-gold/60"
              >
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gold/80 hover:bg-gold text-ink font-bold py-2 rounded transition-colors disabled:opacity-50"
              >
                {loading ? '...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setError(''); }}
                className="px-4 py-2 border border-gold/20 text-parchment/50 hover:text-parchment rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
