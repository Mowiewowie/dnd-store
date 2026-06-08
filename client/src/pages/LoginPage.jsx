import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function LoginPage() {
  const [tab, setTab] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('player');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(username, password);
      } else {
        await register(username, password, role);
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1208]">
      <div className="bg-ink border border-gold/30 rounded-lg p-8 w-full max-w-md shadow-2xl">
        <h1 className="text-3xl text-gold text-center mb-2" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
          ⚔ The Bazaar
        </h1>
        <p className="text-parchment/50 text-center text-sm mb-6">A marketplace for adventurers</p>

        <div className="flex border border-gold/20 rounded mb-6">
          {['login', 'register'].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-2 text-sm capitalize transition-colors ${tab === t ? 'bg-gold/20 text-gold' : 'text-parchment/50 hover:text-parchment'}`}
            >
              {t === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-parchment/70 text-sm mb-1">Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-stone/20 border border-gold/20 rounded px-3 py-2 text-parchment focus:outline-none focus:border-gold/60"
              placeholder="Enter username"
              required
            />
          </div>
          <div>
            <label className="block text-parchment/70 text-sm mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-stone/20 border border-gold/20 rounded px-3 py-2 text-parchment focus:outline-none focus:border-gold/60"
              placeholder="Enter password"
              required
            />
          </div>
          {tab === 'register' && (
            <div>
              <label className="block text-parchment/70 text-sm mb-1">Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full bg-stone/20 border border-gold/20 rounded px-3 py-2 text-parchment focus:outline-none focus:border-gold/60"
              >
                <option value="player">Player</option>
                <option value="dm">Dungeon Master</option>
              </select>
            </div>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold/80 hover:bg-gold text-ink font-bold py-2 rounded transition-colors disabled:opacity-50"
            style={{ fontFamily: 'Cinzel, Georgia, serif' }}
          >
            {loading ? '...' : tab === 'login' ? 'Enter the Bazaar' : 'Join the Bazaar'}
          </button>
        </form>
      </div>
    </div>
  );
}
