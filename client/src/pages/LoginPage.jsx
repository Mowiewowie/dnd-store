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
    <div className="min-h-screen flex items-center justify-center bg-base px-4">
      <div className="card-fancy w-full max-w-md shadow-2xl p-8">
        <h1 className="fantasy-heading text-3xl text-center mb-1">⚔ The Bazaar</h1>
        <p className="text-parchment/40 text-center text-xs tracking-widest uppercase mb-6">
          A marketplace for adventurers
        </p>

        {/* Tab switcher — bottom border indicator style */}
        <div className="flex border-b border-gold/20 mb-6">
          {['login', 'register'].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 pb-2 text-sm capitalize transition-colors ${
                tab === t
                  ? 'text-gold border-b-2 border-gold -mb-px'
                  : 'text-parchment/40 hover:text-parchment/70'
              }`}
            >
              {t === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-parchment/60 text-xs uppercase tracking-wider mb-1.5">Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="input-field"
              placeholder="Enter username"
              required
            />
          </div>
          <div>
            <label className="block text-parchment/60 text-xs uppercase tracking-wider mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field"
              placeholder="Enter password"
              required
            />
          </div>
          {tab === 'register' && (
            <div>
              <label className="block text-parchment/60 text-xs uppercase tracking-wider mb-1.5">Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="input-field [&>option]:bg-ink [&>option]:text-parchment"
                style={{ colorScheme: 'dark' }}
              >
                <option value="player">Player</option>
                <option value="dm">Dungeon Master</option>
              </select>
            </div>
          )}
          {error && <p className="text-ember-light text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-2.5 mt-2"
            style={{ fontFamily: 'Cinzel, Georgia, serif' }}
          >
            {loading ? '...' : tab === 'login' ? 'Enter the Bazaar' : 'Join the Bazaar'}
          </button>
        </form>
      </div>
    </div>
  );
}
