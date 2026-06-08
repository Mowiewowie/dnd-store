import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../utils/api.js';

const SELECT_CLASS = 'w-full bg-[#1a1208] border border-gold/20 rounded px-3 py-2 text-parchment focus:outline-none focus:border-gold/60 [&>option]:bg-[#1a1208] [&>option]:text-parchment';

export function CampaignSelectPage() {
  const { user, selectCampaign, logout } = useAuth();
  const navigate = useNavigate();

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  // DM creation form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);

  // Player join form
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/campaigns')
      .then(setCampaigns)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleSelect(camp) {
    selectCampaign(camp);
    if (user?.role === 'dm') navigate('/dm');
    else navigate('/characters');
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const camp = await api.post('/campaigns', { name: createName });
      setCampaigns(prev => [camp, ...prev]);
      setShowCreate(false);
      setCreateName('');
      handleSelect(camp);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    setError('');
    setJoining(true);
    try {
      const camp = await api.post('/campaigns/join', { code: joinCode });
      setCampaigns(prev => [camp, ...prev]);
      setShowJoin(false);
      setJoinCode('');
      handleSelect(camp);
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-[#1a1208] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl text-gold" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
            {user?.role === 'dm' ? '⚔ Your Campaigns' : '⚔ Choose a Campaign'}
          </h1>
          <button onClick={handleLogout} className="text-xs text-parchment/40 hover:text-ember transition-colors">
            Logout
          </button>
        </div>
        <p className="text-parchment/50 text-sm mb-8">
          {user?.role === 'dm'
            ? 'Select a campaign to manage, or create a new one.'
            : 'Select a campaign to join the adventure.'}
        </p>

        {loading ? (
          <p className="text-parchment/40 text-sm text-center">Loading...</p>
        ) : (
          <>
            {campaigns.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {campaigns.map(camp => (
                  <button
                    key={camp.id}
                    onClick={() => handleSelect(camp)}
                    className="bg-ink border border-gold/30 hover:border-gold/70 rounded-lg p-4 text-left transition-all hover:bg-stone/10 group"
                  >
                    <p className="text-parchment font-bold text-lg group-hover:text-gold transition-colors">
                      {camp.name}
                    </p>
                    <p className="text-parchment/40 text-xs mt-1">
                      DM: {camp.dm_username} · {camp.member_count} member{camp.member_count !== 1 ? 's' : ''}
                    </p>
                    {user?.role === 'dm' && camp.dm_id === user.id && (
                      <p className="text-gold/60 text-xs mt-2 font-mono tracking-widest">
                        Code: {camp.join_code}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {campaigns.length === 0 && !showCreate && !showJoin && (
              <p className="text-parchment/40 text-sm text-center mb-6">
                {user?.role === 'dm' ? 'No campaigns yet. Create one below!' : 'You haven\'t joined any campaigns yet.'}
              </p>
            )}

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            {/* DM: Create Campaign */}
            {user?.role === 'dm' && !showCreate && (
              <button
                onClick={() => { setShowCreate(true); setShowJoin(false); setError(''); }}
                className="w-full border border-dashed border-gold/30 hover:border-gold/60 rounded-lg p-4 text-parchment/50 hover:text-parchment transition-all text-sm mb-3"
              >
                + Create New Campaign
              </button>
            )}

            {user?.role === 'dm' && showCreate && (
              <form onSubmit={handleCreate} className="bg-ink border border-gold/30 rounded-lg p-6 space-y-4 mb-3">
                <h2 className="text-gold" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>New Campaign</h2>
                <input
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  placeholder="Campaign name"
                  required
                  className="w-full bg-[#1a1208] border border-gold/20 rounded px-3 py-2 text-parchment focus:outline-none focus:border-gold/60"
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-gold/80 hover:bg-gold text-ink font-bold py-2 rounded transition-colors disabled:opacity-50"
                  >
                    {creating ? '...' : 'Create & Enter'}
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

            {/* Players: Join Campaign */}
            {user?.role !== 'dm' && !showJoin && (
              <button
                onClick={() => { setShowJoin(true); setShowCreate(false); setError(''); }}
                className="w-full border border-dashed border-gold/30 hover:border-gold/60 rounded-lg p-4 text-parchment/50 hover:text-parchment transition-all text-sm mb-3"
              >
                + Join Campaign with Code
              </button>
            )}

            {user?.role !== 'dm' && showJoin && (
              <form onSubmit={handleJoin} className="bg-ink border border-gold/30 rounded-lg p-6 space-y-4 mb-3">
                <h2 className="text-gold" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>Join Campaign</h2>
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="8-character code (e.g. AB3X7YQ2)"
                  maxLength={8}
                  required
                  className="w-full bg-[#1a1208] border border-gold/20 rounded px-3 py-2 text-parchment font-mono tracking-widest focus:outline-none focus:border-gold/60 uppercase"
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={joining}
                    className="flex-1 bg-gold/80 hover:bg-gold text-ink font-bold py-2 rounded transition-colors disabled:opacity-50"
                  >
                    {joining ? '...' : 'Join & Enter'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowJoin(false); setError(''); }}
                    className="px-4 py-2 border border-gold/20 text-parchment/50 hover:text-parchment rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
