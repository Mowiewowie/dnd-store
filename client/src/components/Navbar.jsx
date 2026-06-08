import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { formatGold } from '../utils/gold.js';

export function Navbar() {
  const { user, character, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <nav className="bg-ink border-b border-gold/30 px-6 py-3 flex items-center justify-between">
      <Link to="/market" className="text-gold font-bold text-xl tracking-wide" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
        ⚔ The Adventurer's Bazaar
      </Link>

      <div className="flex items-center gap-6">
        {character && (
          <>
            <Link to="/market" className="text-parchment hover:text-gold text-sm">Market</Link>
            <Link to="/character" className="text-parchment hover:text-gold text-sm">My Character</Link>
            {user?.role === 'dm' && (
              <Link to="/dm" className="text-ember hover:text-red-400 text-sm font-semibold">DM Panel</Link>
            )}
          </>
        )}

        {character && (
          <span className="text-gold text-sm font-semibold bg-ink/50 px-3 py-1 rounded border border-gold/30">
            🪙 {formatGold(character.gold_gp, character.gold_sp, character.gold_cp)}
          </span>
        )}

        {user && (
          <div className="flex items-center gap-3">
            <span className="text-parchment/60 text-xs">{user.username}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-parchment/50 hover:text-ember transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
