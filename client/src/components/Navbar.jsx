import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { formatGold } from '../utils/gold.js';
import { CopyButton } from './CopyButton.jsx';

export function Navbar() {
  const { user, campaign, character, logout, clearCampaign, clearCharacter } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function handleSwitchCharacter() {
    clearCharacter();
    navigate('/characters');
  }

  function handleSwitchCampaign() {
    clearCampaign();
    navigate('/');
  }

  return (
    <nav className="bg-ink border-b border-gold/30 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link to="/market" className="text-gold font-bold text-xl tracking-wide" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
          ⚔ The Adventurer's Bazaar
        </Link>
        {campaign && (
          <div className="flex items-center gap-2 border border-gold/20 rounded px-2 py-0.5">
            <span className="text-parchment/40 text-xs">{campaign.name}</span>
            {campaign.join_code && (
              <>
                <span className="text-gold/40 text-xs font-mono tracking-widest">{campaign.join_code}</span>
                <CopyButton text={campaign.join_code} />
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        {character && (
          <>
            <Link to="/market" className="text-parchment hover:text-gold text-sm">Market</Link>
            <Link to="/character" className="text-parchment hover:text-gold text-sm">Purchase History</Link>
            <button onClick={handleSwitchCharacter} className="text-parchment hover:text-gold text-sm">Switch Character</button>
            {user?.role === 'dm' && (
              <Link to="/dm" className="text-ember hover:text-red-400 text-sm font-semibold">DM Panel</Link>
            )}
          </>
        )}

        {!character && campaign && user?.role === 'dm' && (
          <Link to="/dm" className="text-ember hover:text-red-400 text-sm font-semibold">DM Panel</Link>
        )}

        {character && (
          <span className="text-gold text-sm font-semibold bg-ink/50 px-3 py-1 rounded border border-gold/30">
            🪙 {formatGold(character.gold_gp, character.gold_sp, character.gold_cp)}
          </span>
        )}

        {campaign && (
          <button onClick={handleSwitchCampaign} className="text-parchment/40 hover:text-parchment text-xs transition-colors">
            Switch Campaign
          </button>
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
