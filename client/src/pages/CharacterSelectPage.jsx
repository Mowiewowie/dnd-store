import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../utils/api.js';
import { GoldDisplay } from '../components/GoldDisplay.jsx';
import { OrnamentDivider } from '../components/OrnamentDivider.jsx';

const CLASSES = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard', 'Adventurer'];

export function CharacterSelectPage() {
  const { campaign, selectCharacter, logout } = useAuth();
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [charClass, setCharClass] = useState('Fighter');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleteError, setDeleteError] = useState('');

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

  async function handleDelete() {
    if (deleteConfirmName !== deleteTarget.name) return;
    try {
      await api.delete(`/characters/${deleteTarget.id}`);
      setCharacters(prev => prev.filter(c => c.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteConfirmName('');
      setDeleteError('');
    } catch (err) {
      setDeleteError(err.message);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-2">
          <h1 className="fantasy-heading text-3xl page-title-chars">Choose Your Character</h1>
          <button onClick={handleLogout} className="text-xs text-parchment/40 hover:text-ember-light transition-colors">
            Logout
          </button>
        </div>
        {campaign && (
          <p className="text-parchment/40 text-sm mb-2">
            Campaign: <span className="text-gold/70">{campaign.name}</span>
          </p>
        )}
        <p className="text-parchment/40 text-center text-sm mb-2">Who ventures to the bazaar today?</p>
        <div className="section-divider" />

        {characters.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {characters.map(char => (
              <div
                key={char.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelect(char)}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleSelect(char)}
                className="card-fancy hover:border-gold/60 p-4 text-left transition-all hover:bg-stone/10 group cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-parchment font-bold text-lg group-hover:text-gold transition-colors"
                       style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
                      {char.name}
                    </p>
                    <p className="text-parchment/40 text-sm">{char.class}</p>
                  </div>
                  <GoldDisplay gp={char.gold_gp} sp={char.gold_sp} cp={char.gold_cp} className="text-sm" />
                </div>
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setDeleteTarget(char); setDeleteConfirmName(''); setDeleteError(''); }}
                    className="text-parchment/20 hover:text-ember-light text-xs transition-colors"
                    aria-label={`Delete ${char.name}`}
                  >
                    Delete character
                  </button>
                </div>
              </div>
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
          <div className="card-fancy p-6 space-y-4">
            <h2 className="fantasy-heading text-lg">New Character</h2>
            <OrnamentDivider className="my-2" />
            <div>
              <label className="block text-parchment/60 text-xs uppercase tracking-wider mb-1.5">Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="input-field"
                placeholder="Character name"
                required
              />
            </div>
            <div>
              <label className="block text-parchment/60 text-xs uppercase tracking-wider mb-1.5">Class</label>
              <select
                value={charClass}
                onChange={e => setCharClass(e.target.value)}
                className="input-field [&>option]:bg-ink [&>option]:text-parchment"
                style={{ colorScheme: 'dark' }}
              >
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {error && <p className="text-ember-light text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleCreate}
                disabled={loading}
                className="btn btn-primary flex-1 py-2"
              >
                {loading ? '...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setError(''); }}
                className="btn btn-secondary px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          {/* Scroll-like double-border modal */}
          <div className="bg-base border border-gold/20 rounded-lg p-1 w-full max-w-sm shadow-2xl">
            <div className="card-fancy p-6">
              <h2 className="fantasy-heading text-xl mb-1">Delete Character</h2>
              <OrnamentDivider className="my-3" />
              <p className="text-parchment/60 text-sm mb-4">
                This is permanent. Type{' '}
                <span className="text-parchment font-semibold">{deleteTarget.name}</span>{' '}
                to confirm.
              </p>
              <input
                value={deleteConfirmName}
                onChange={e => setDeleteConfirmName(e.target.value)}
                placeholder="Type the name to confirm"
                autoFocus
                className="input-field mb-4"
                style={{ borderColor: deleteConfirmName && deleteConfirmName !== deleteTarget.name ? 'rgba(196,64,32,0.5)' : undefined }}
              />
              {deleteError && <p className="text-ember-light text-xs mb-2">{deleteError}</p>}
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={deleteConfirmName !== deleteTarget.name}
                  className="btn btn-danger flex-1 py-2"
                >
                  Delete
                </button>
                <button
                  onClick={() => { setDeleteTarget(null); setDeleteConfirmName(''); setDeleteError(''); }}
                  className="btn btn-secondary flex-1 py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
