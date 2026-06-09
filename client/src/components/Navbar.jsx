import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { formatGold } from '../utils/gold.js';
import { CopyButton } from './CopyButton.jsx';

function ChevronIcon({ open }) {
  return (
    <svg
      className={`w-3 h-3 opacity-50 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

const navLinkClass = ({ isActive }) =>
  `text-xs sm:text-sm transition-colors whitespace-nowrap pb-0.5 ${
    isActive
      ? 'text-gold border-b border-gold/60'
      : 'text-parchment/60 hover:text-parchment border-b border-transparent'
  }`;

export function Navbar() {
  const { user, campaign, character, logout, clearCampaign, clearCharacter } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    setDropdownOpen(false);
    await logout();
    navigate('/login');
  }

  function handleSwitchCharacter() {
    setDropdownOpen(false);
    clearCharacter();
    navigate('/characters');
  }

  function handleSwitchCampaign() {
    setDropdownOpen(false);
    clearCampaign();
    navigate('/');
  }

  const isDM = user?.role === 'dm';
  const hasAccountActions = character || campaign;

  return (
    <nav className="navbar px-4 sm:px-6 py-3 flex items-center gap-2 sm:gap-3 shrink-0">

      {/* ── Left: logo + campaign pill ── */}
      <div className="flex items-center gap-2 shrink-0">
        <Link
          to="/"
          className="font-bold tracking-wide shrink-0 leading-none"
          style={{
            fontFamily: 'Cinzel, Georgia, serif',
            color: '#c9a84c',
            textShadow: '0 0 20px rgba(201,168,76,0.3)',
          }}
        >
          <span className="hidden sm:inline text-lg text-gold">⚔ The Adventurer's Bazaar</span>
          <span className="sm:hidden text-base text-gold">⚔ Bazaar</span>
        </Link>

        {campaign && (
          <div className="hidden lg:flex items-center gap-1 border border-gold/20 rounded px-2 py-0.5 min-w-0 bg-stone/10">
            <span className="text-parchment/40 text-xs truncate max-w-[8rem]">{campaign.name}</span>
            {campaign.join_code && (
              <>
                <span className="text-gold/40 text-xs font-mono tracking-widest shrink-0 ml-1">{campaign.join_code}</span>
                <CopyButton text={campaign.join_code} />
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Center: primary nav ── */}
      <div className="flex-1 flex items-center justify-center gap-4 sm:gap-6">
        {character && (
          <>
            <NavLink to="/market" className={navLinkClass}>Market</NavLink>
            <NavLink to="/character" className={navLinkClass}>My Character</NavLink>
          </>
        )}
        {isDM && (
          <>
            <NavLink to="/dm" end className={navLinkClass}>Markets</NavLink>
            <NavLink to="/dm/characters" className={navLinkClass}>Characters</NavLink>
          </>
        )}
      </div>

      {/* ── Right: gold + user dropdown ── */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">

        {character && (
          <span className="text-gold text-xs sm:text-sm font-semibold bg-gold/10 px-1.5 sm:px-2.5 py-1 rounded border border-gold/25 whitespace-nowrap">
            🪙{' '}
            <span className="sm:hidden">{character.gold_gp} GP</span>
            <span className="hidden sm:inline">{formatGold(character.gold_gp, character.gold_sp, character.gold_cp)}</span>
          </span>
        )}

        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(o => !o)}
              className="flex items-center gap-1.5 text-parchment/70 hover:text-parchment transition-colors"
            >
              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center text-gold text-xs sm:text-sm font-bold uppercase shrink-0"
                    style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
                {user.username[0]}
              </span>
              <span className={`hidden lg:block text-sm max-w-[6rem] truncate ${isDM ? 'text-ember' : ''}`}>{user.username}</span>
              {isDM && <span className="hidden lg:block text-ember text-xs font-semibold shrink-0">(DM)</span>}
              <span className="hidden lg:block"><ChevronIcon open={dropdownOpen} /></span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-ink border border-gold/30 rounded-lg shadow-2xl py-1 z-50">

                <div className="px-4 py-2.5 border-b border-gold/10">
                  <p className="text-parchment/35 text-xs">Signed in as</p>
                  <div className="flex items-center gap-1.5">
                    <p className={`text-sm font-medium truncate ${isDM ? 'text-ember' : 'text-parchment'}`}>{user.username}</p>
                    {isDM && <span className="text-ember text-xs font-semibold shrink-0">(DM)</span>}
                  </div>
                </div>

                {campaign && (
                  <div className="lg:hidden px-4 py-2.5 border-b border-gold/10">
                    <p className="text-parchment/35 text-xs mb-1">Campaign</p>
                    <p className="text-parchment/70 text-sm truncate">{campaign.name}</p>
                    {campaign.join_code && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-gold/60 text-xs font-mono tracking-widest">{campaign.join_code}</span>
                        <CopyButton text={campaign.join_code} />
                      </div>
                    )}
                  </div>
                )}

                {character && (
                  <button
                    onClick={handleSwitchCharacter}
                    className="w-full text-left px-4 py-2 text-parchment/60 hover:text-parchment hover:bg-stone/20 text-sm transition-colors"
                  >
                    Switch Character
                  </button>
                )}
                {campaign && (
                  <button
                    onClick={handleSwitchCampaign}
                    className="w-full text-left px-4 py-2 text-parchment/60 hover:text-parchment hover:bg-stone/20 text-sm transition-colors"
                  >
                    Switch Campaign
                  </button>
                )}
                {hasAccountActions && <div className="border-t border-gold/10 my-1" />}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-ember/70 hover:text-ember-light hover:bg-stone/20 text-sm transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
